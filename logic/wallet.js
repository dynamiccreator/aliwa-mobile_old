loki = require("lokijs");
fs = require('fs');
aes256 = require("aes256");

crypto = require('crypto');
argon2 = require('argon2');

numeral = require('numeral');

io = require('socket.io-client');

bip39 = require("bip39");
hdkey = require("hdkey");
createHash = require("create-hash");
bs58check = require("bs58check");
bs58_2 = require("bs58");


class aliwa_wallet{       
                
    constructor(){
     this.addr_stan_pos=0;
     this.addr_change_pos=0;
     
     this.const_fee=0.0001;
     this.sync_state=null;
     this.gui_was_updated=false;
     this.sync_fails=0;
     this.pagination_num=10;
     this.sync_shift=0;
     this.initial_sync=false;
     this.sync_id=null;
                          
       const db_wallet_r=require("./db_wallet");
       this.db_wallet=new db_wallet_r.db_wallet();
       const wallet_functions_r=require("./wallet_functions");
       this.wallet_functions=new wallet_functions_r.wallet_functions();
    }
    
       
    //wallet itself,syncing and  status
    async create_wallet(seed_words,seed_pw,wallet_pw){
        if(seed_words==null){
            seed_words=this.wallet_functions.get_new_seed_words();                             
        }
//        console.log(seed_words);
        console.log("CREATE WALLET");
        var master_seed_string=null;
        if(seed_pw==null){master_seed_string=await this.wallet_functions.get_master_seed_string(seed_words);}
        else{master_seed_string=await this.wallet_functions.get_master_seed_string(seed_words,seed_pw);}
//        console.log(master_seed_string);
        
        //set config
        this.db_wallet.update_config({seed_words:seed_words,seed_pw:seed_pw,master_seed:master_seed_string,wallet_pw:wallet_pw,
                                      sync_height:0,last_rewind:{time:0,block_height:0},balance:{unconfirmed:0,available:0,total:0},
                                      used_pos:{standard:0,change:0}});
        
        //save wallet
        this.save_wallet(null);
        
        
    }
    
    read_wallet_DB(path){       
        var data=this.db_wallet.read_database(path);
        if(data=="file not found"){return false;}
        else{
            return data;
        }       
    }
    
          
    async load_wallet_DB(data,pw){  
        return await this.db_wallet.load_database(data,pw);               
    }
    
 
    save_wallet(path){
        //save_database
        console.error("SAVING WAS CALLED");
        var obj=this.db_wallet.get_config_values();
        this.db_wallet.save_database(path,obj.wallet_pw,obj.wallet_pw_salt);
        this.gui_was_updated=false;
    }
    
    //connect with server
    async connect_to_server(){
        //start the server for light wallet        
        var SocksProxyAgent = require('socks-proxy-agent');
        var agent = new SocksProxyAgent("socks://localhost:9050");    
        
        
//        this.socket =  await io.connect('ws://aliwa5ld6pm66lbwb2kfyzvqzco24ihnmzoknvaqg4uqhpdtelnfa4id.onion:3000', { agent: agent });
        this.socket =  await io.connect('ws://localhost:3000');

        this.socket.on('connect', async socket => {
             console.log("connected to server");
            // either with send()
            this.socket.send('hello'); 
            this.sync();
        });
        
        // handle the event sent with socket.send()
            this.socket.on('message', (data) => {
                console.log(data);
            }); 
        
         // handle the event sent with socket.send()
            this.socket.on('server_respond_sync_data',async (data) => {
                await this.update_from_server(data);
            });
            
            this.socket.on("server_respond_send_raw_tx",(result) =>{
                console.log("##############SEND TX ANSWER: ",result);
//                console.log("send_array:"+JSON.stringify(result));
//                console.log("pure_message:",JSON.parse(result.message));
                
        var message=JSON.parse(result.message);
        if(message.result==undefined || message.result==null){return false;}
        if(message.result.length==64){    //only if result is a valid tx
            
            //update self sent                                                   
            this.db_wallet.update_self_sent_txs(message.result,result.data.inputs,result.data.outputs);
            //update transactions

            var cnf=this.db_wallet.get_config_values();
            var private_standard_address_list=this.db_wallet.get_wallet_addresses(0,0,(cnf.used_pos.standard+20));
            var private_change_address_list=this.db_wallet.get_wallet_addresses(1,0,(cnf.used_pos.change+20));
            this.db_wallet.update_transactions({from:cnf.sync_height+1,to:cnf.sync_height,inputs:[],outputs:[]},private_standard_address_list,private_change_address_list);
            this.gui_was_updated=false;
            this.save_wallet(null);
        }
        else{
            console.error(message.error);
            return message.error;
        }
        
                
            });
            
            this.socket.on('disconnect', async function () {
            // handle disconnect
            console.log("Server disconnected");          
            });                      
    }
    
    async disconnect(){
       await this.socket.disconnect();     
       this.socket=null;
    }
    
     sync(){
        if(!this.db_wallet.wallet_loaded){        
            return;
        }
        this.sync_state="syncing";
        var cnf=this.db_wallet.get_config_values();   
//         console.log("syncing "+(cnf.used_pos.standard+20)+"| "+(cnf.used_pos.change+20));
        this.addr_stan_pos=(cnf.used_pos.standard+25);
        this.addr_change_pos=(cnf.used_pos.change+25);
        
        var private_standard_address_list=this.db_wallet.get_wallet_addresses(0,0,this.addr_stan_pos);
        var private_change_address_list=this.db_wallet.get_wallet_addresses(1,0,this.addr_change_pos);
        var addresses=[];
                          
        for(var i=0,len=private_standard_address_list.length;i<len;i++){
            addresses.push(private_standard_address_list[i].address);
        }
        
        for(var i=0,len=private_change_address_list.length;i<len;i++){
            addresses.push(private_change_address_list[i].address);
        }
//        console.log("addresses | "+addresses.length);
//        console.log(addresses);
//    console.log('sync_from '+cnf.sync_height+"\n",cnf.last_rewind);
        
       
        this.sync_id=crypto.randomBytes(12).toString('hex');               
        this.socket.emit('sync_from',cnf.sync_height, addresses,cnf.last_rewind,this.sync_id);
//this.socket.emit('sync_from',0, addresses,cnf.last_rewind);
    }
    
    update_from_server(data){
        var cnf=this.db_wallet.get_config_values();  
        if(data.sync_id!=this.sync_id && cnf.sync_height==0){ // prevent overriding with older data
            console.error("OLD SYNC"); 
            return;
        }
        console.log("server_respond_sync_data");
//        console.log(data);
//        console.log(JSON.stringify(data).length);

//        for(var i=0;i<data.inputs.length;i++){
//            console.log(data.inputs[i]);
//        }
//        
//        for(var i=0;i<data.outputs.length;i++){
//            console.log(data.outputs[i]);
//        }

//console.log(util.inspect(data, false, null, true /* enable colors */))
       
        
//        console.log("pos before update: "+cnf.used_pos.standard);
        var private_standard_address_list=this.db_wallet.get_wallet_addresses(0,0,(cnf.used_pos.standard+20));
        var private_change_address_list=this.db_wallet.get_wallet_addresses(1,0,(cnf.used_pos.change+20));
        
               
        if(data.outputs!=undefined || data.inputs!=undefined){
            
            this.db_wallet.update_transactions(data,private_standard_address_list,private_change_address_list,this.initial_sync); 
            this.initial_sync=false;
                                          
            if(this.addr_stan_pos <= (cnf.used_pos.standard+20) || this.addr_change_pos <= (cnf.used_pos.change+20)){
                if(cnf.sync_height==0){
                    //initial sync get more addresses from height zero
                    this.initial_sync=true;
                    this.sync();
                }
                else{
                    this.db_wallet.update_config({sync_height:data.to,last_rewind:data.last_rewind});
                    this.sync();                   
                }
                 
            }
            else{
                this.db_wallet.update_config({sync_height:data.to,last_rewind:data.last_rewind});
                this.initial_sync=false;
                
                this.sync_state="synced";
                this.gui_was_updated=false;
                this.save_wallet(null);
                }

        }
        else{
            console.log("waiting for server sync \n",data);
            this.sync_state="waiting";
            var that=this;

            setTimeout(function(){
                if(that.sync_state=="waiting"){
                    if(that.sync_fails<4){
                        that.sync();
                        that.sync_fails++;
                        that.sync_shift+=500;
                        }
                }else{that.sync_fails=0;}
            },1500);
                    }
            

        }
                       
    set_gui_updated(set){
        this.gui_was_updated=set;       
    }
    
    get_gui_updated(){
        return this.gui_was_updated;       
    }
      
    
    async is_synced(){
       if(this.sync_state=="syncing"){
           return true;
       } 
       else{return false;}
    }
    
    //config
    get_wallet_pw(){
        var obj=this.db_wallet.get_config_values();
        return {pw_hash:obj.wallet_pw,pw_salt:obj.wallet_pw_salt};
    }
    
    async set_wallet_pw(new_pw){
        if(new_pw!=null && new_pw!=""){
            var pw_hash_data=await this.db_wallet.get_argon2_password_data(new_pw);
            this.db_wallet.update_config({"wallet_pw":pw_hash_data.hash,"wallet_pw_salt":pw_hash_data.salt,"wallet_pw_clear":new_pw});    
        }
        else{
            this.db_wallet.update_config({"wallet_pw":null,"wallet_pw_salt":null,"wallet_pw_clear":null}); 
        }
        
        this.save_wallet(null); 
        return true;
    }
    
    compare_pw(pw){
        var obj=this.db_wallet.get_config_values();
//        var compare=await this.db_wallet.get_argon2_password_data(pw,obj.wallet_pw_salt);
        if(pw==obj.wallet_pw_clear || (pw=="" && obj.wallet_pw_clear==null)){return true;}
        else{return false;}
    }
    //seed
    get_wallet_seed(){
        var obj=this.db_wallet.get_config_values();
        return {seed_words:obj.seed_words,seed_pw:obj.seed_pw};
    }
    
    
    //adressbook    
    
        //addressbook receive
     is_duplicated_label(label){
        var receive_addresses=this.db_wallet.get_receive_addresses();
        var contact_addresses=this.db_wallet.get_contact_addresses();
        
        if(receive_addresses.findOne({label: {'$aeq': label}})!=null || contact_addresses.findOne({label: {'$aeq': label}})!=null){
            return true;
        }
        return false;
        
    }  
    
     is_duplicated_address(address){
        var receive_addresses=this.db_wallet.get_receive_addresses();
        var contact_addresses=this.db_wallet.get_contact_addresses();
        
        if(receive_addresses.findOne({address: {'$aeq': address}})!=null || contact_addresses.findOne({address: {'$aeq': address}})!=null){
            return true;
        }
        return false;
        
    } 
        
        
     change_receive_address_label(pos,label){
        var receive_addresses=this.db_wallet.get_receive_addresses();
        if(label!="" && label!=null && this.is_duplicated_label(label)){console.log("duplicated");return "duplicated";}
        var selected_addr=receive_addresses.findOne({"pos": {'$aeq': pos}});
        selected_addr.label=label;
        receive_addresses.update(selected_addr);
        return true;
    }
      
     new_receive_address(label) {
        var cnf = this.db_wallet.get_config_values();
        var receive_addresses = this.db_wallet.get_receive_addresses();
        console.log(receive_addresses.count());
        var addr_count = receive_addresses.count();
        
        var address_list=receive_addresses.chain().find().simplesort("pos").data({forceClones: true, removeMeta: true});
        var highest_pos=0;
        if(address_list!=null){
            highest_pos=address_list[address_list.length-1].pos;
        }
        
        
              
        if (addr_count < cnf.used_pos.standard + 20) {
            var private_standard_address_list = this.db_wallet.get_wallet_addresses(0, addr_count, addr_count + 1);          

            if(label!="" && label!=null &&  this.is_duplicated_label(label)){console.log("duplicated");return "duplicated";}
            if (receive_addresses.findOne({pos: {'$aeq': private_standard_address_list[0].pos}}) == null) {
                receive_addresses.insert({pos: private_standard_address_list[0].pos, address: private_standard_address_list[0].address, label: (label == "" ? null : label)});
                console.log("insert new address HD# " + (private_standard_address_list[0].pos + 1) + "to address_book: " + private_standard_address_list[0].address + " | " + private_standard_address_list[0].pos);
                return true;
            }
                      
        } else {
            return "unused";
        }
        
        return false;


    }
    
    async list_receive_addresses(page, order_field, direction, search) {
        // returns the number of all adresses + an array of addresses in standard order from page "page"  
        // (e.g. page 1 shows addresses 1-20) -> {num:84,addresses:[{address:"S...",label:"my example addresss"},{address:"S...",label:"my 2nd example addresss"}]}
        if (search == undefined || search == null || search == "") {
            var txs = this.db_wallet.get_receive_addresses();
            var result = [];
            var tx_array = txs.chain().find().simplesort(order_field, {desc: direction}).data({forceClones: true, removeMeta: true});
            var len = tx_array.length;
            var page_start = page * this.pagination_num;
            for (var i = page_start; i < page_start + this.pagination_num && i < len; i++) {
                result.push(tx_array[i]);
            }
            return {page: page, result: result, page_max: Math.ceil(len / this.pagination_num)};

        } else {
            search=search.trim();
            var txs = this.db_wallet.get_receive_addresses();
            var result = [];
            var tx_array = txs.chain().find({'$or': [
                    {"pos": {'$aeq': (parseInt(search)-1)}},
                    {"label": {'$contains': search}},
                    {"address": {'$contains': search}}                    
                ]}).simplesort(order_field, {desc: direction}).data({forceClones: true, removeMeta: true});
            var len = tx_array.length;
            var page_start = page * this.pagination_num;
            for (var i = page_start; i < page_start + this.pagination_num && i < len; i++) {
                result.push(tx_array[i]);
            }
            return {page: page, result: result, page_max: Math.ceil(len / this.pagination_num)};                                          
        }
    }
    
    get_highest_unused_receive_address(){
        var receive_addresses=this.db_wallet.get_receive_addresses();
        var latest_addr=receive_addresses.chain().find().simplesort("pos", {desc: true}).data({forceClones: true, removeMeta: true})[0];      
        return latest_addr;
    }
    
        //addressbook contacts
     change_contact_address_label(pos,label,allow_basic){
        if(pos<3 && allow_basic!=true){return false;}
        var contact_addresses=this.db_wallet.get_contact_addresses();
        
        if ((label!=undefined && label != "" && label != null && this.is_duplicated_label(label))) {          
            return "duplicated label";
        }
           
        var selected_addr=contact_addresses.findOne({"pos": {'$aeq': pos}});
        selected_addr.label=label;       
        contact_addresses.update(selected_addr);
        
        return true;
    }
    
     change_contact_address_address(pos,address){
        var contact_addresses=this.db_wallet.get_contact_addresses();
        
        if ((address != "" && address != null && this.is_duplicated_address(address))) {          
            return "duplicated address";
        }
           
        var selected_addr=contact_addresses.findOne({"pos": {'$aeq': pos}});
        selected_addr.address=address;       
        contact_addresses.update(selected_addr);
        
        return true;
    }
    
     change_contact_address_label_find_by_address(address,label){     
        var contact_addresses=this.db_wallet.get_contact_addresses();
        var receive_addresses=this.db_wallet.get_receive_addresses();
        
        if ((label!=undefined && label != "" && label != null && this.is_duplicated_label(label))) {          
            return "duplicated label";
        }
        
        if(address==(contact_addresses.findOne({pos: {'$aeq': 0}}).address)){return false;}
        if(address==(contact_addresses.findOne({pos: {'$aeq': 1}}).address)){return false;}
        if(address==(contact_addresses.findOne({pos: {'$aeq': 2}}).address)){return false;}
        
        if(receive_addresses.findOne({address: {'$aeq': address}})!=null){return false;}
              
        var selected_addr=contact_addresses.findOne({"address": {'$aeq': address}});
        selected_addr.label=label;     
        contact_addresses.update(selected_addr);
        
        return true;
    }
      
     new_contact_address(label,address) {       
        var contact_addresses = this.db_wallet.get_contact_addresses();
       // console.log(contact_addresses.count());
        var addr_count = contact_addresses.count();


        if ((label!=undefined && label != "" && label != null && this.is_duplicated_label(label))) {          
            return "duplicated label";
        }
        if (this.is_duplicated_address(address)) {        
            return "duplicated address";
        }
        if (contact_addresses.findOne({pos: {'$aeq': addr_count}}) == null) {
            contact_addresses.insert({pos: addr_count, address: address, label: (label == "" ? null : label)});           
            return true;
        }
        return false;
    }
    
      delete_contact_address(pos){
         if(pos<3){return false;}
        var contact_addresses=this.db_wallet.get_contact_addresses();
        contact_addresses.chain().find({"pos": {'$aeq': pos}}).remove(); 
        //re order
        var count=0;
        contact_addresses.chain().find({}).simplesort("pos", {desc: false}).update(
            function (doc) {
                doc.pos=count;
                count++;
                return doc;
            });        
    }
        
    
     list_contact_addresses(page, order_field, direction, search) { 
        // add / update standard contacts
        this.new_contact_address("Alias Foundation","SdrdWNtjD7V6BSt3EyQZKCnZDkeE28cZhr");
        this.new_contact_address("Aliwa Donation Address","not implimented");
        this.new_contact_address("Aliwa Server Provider","not implimented & not provided");
                                  
        
        if (search == undefined || search == null || search == "") {
            var txs = this.db_wallet.get_contact_addresses();
            var result = [];
            var tx_array = txs.chain().find().simplesort(order_field, {desc: direction}).data({forceClones: true, removeMeta: true});
            var len = tx_array.length;
            var page_start = page * this.pagination_num;
            for (var i = page_start; i < page_start + this.pagination_num && i < len; i++) {
                result.push(tx_array[i]);
            }
            return {page: page, result: result, page_max: Math.ceil(len / this.pagination_num)};

        } else {
            search=search.trim();
            var txs = this.db_wallet.get_contact_addresses();
            var result = [];
            var tx_array = txs.chain().find({'$or': [
                    {"pos": {'$aeq': (parseInt(search)-1)}},
                    {"label": {'$contains': search}},
                    {"address": {'$contains': search}}                    
                ]}).simplesort(order_field, {desc: direction}).data({forceClones: true, removeMeta: true});
            var len = tx_array.length;
            var page_start = page * this.pagination_num;
            for (var i = page_start; i < page_start + this.pagination_num && i < len; i++) {
                result.push(tx_array[i]);
            }
            return {page: page, result: result, page_max: Math.ceil(len / this.pagination_num)};                                          
        }
    }
    
    
    //get labels
     get_labels(address_list){
        var contact_addresses=this.db_wallet.get_contact_addresses();
        var receive_addresses = this.db_wallet.get_receive_addresses();
        var result=[];
        for(var i=0;i<address_list.length;i++){
            var label=contact_addresses.findOne({'address': {'$aeq': address_list[i]}});
            if(label==null){
                label=receive_addresses.findOne({'address': {'$aeq': address_list[i]}});
            }
            
            if(label==null){
                result.push(label); 
            }
            else{
               result.push(label.label);  
            }
                      
        }
        return result;       
    }
    
     set_label_contact_or_receive(address,label){
        var contact_addresses=this.db_wallet.get_contact_addresses();
        var receive_addresses = this.db_wallet.get_receive_addresses();            
            var res=contact_addresses.findOne({'address': {'$aeq': address}});
            if(res==null){             
                res=receive_addresses.findOne({'address': {'$aeq': address}});
                if(res==null){return this.new_contact_address(label, address);}
                if(label!="" && label!=null &&  this.is_duplicated_label(label)){console.log("duplicated");return "duplicated";}
                var selected_addr=receive_addresses.findOne({"address": {'$aeq': address}});
                selected_addr.label=label;
                receive_addresses.update(selected_addr);
                return true;                                         
            }
            else{                       
                return this.change_contact_address_label_find_by_address(address,label);                             
            }
           
        return false;       
    }
    
    //balance & transactions
    
    async get_balance(){
        var cnf=this.db_wallet.get_config_values(); 
        return cnf.balance;
        
    }
    
     list_transactions(page, order_field, direction, search) {
        // returns the number of all transactions 
        // + an array of transactions ordered by order_field in acsending or descending order based on direction from page "page" 
        // (e.g. page 1 shows transactions 1-20)
        var txs = this.db_wallet.get_txs();
        var result = [];
        if(search==undefined || search==null || search ==""){
            var tx_array = txs.chain().find().simplesort(order_field, {desc: direction}).data({forceClones: true, removeMeta: true});
            var len = tx_array.length;
            var page_start=page*this.pagination_num;
            for(var i=page_start;i<page_start+this.pagination_num && i<len;i++){
                result.push(tx_array[i]);
            }
            var cnf=this.db_wallet.get_config_values(); 

            return {page:page,result:result,page_max:Math.ceil(len/this.pagination_num),sync_height:cnf.sync_height};
        }
        else{
            search=search.trim();
            var tx_array = txs.chain().find({'$or': [
                    {"tx": {'$contains': search}},
                    {"height": {'$aeq': search}},
                    {"human_time": {'$contains': search}},
                    {"type": {'$contains': search}},
                    {"address": {'$contains': search}},
                    {"value": {'$contains': search}},
                    {"note": {'$contains': search}},
                    {"blockhash": {'$contains': search}}
                ]}).simplesort(order_field, {desc: direction}).data({forceClones: true, removeMeta: true});
            var len = tx_array.length;
            var page_start = page * this.pagination_num;
            for (var i = page_start; i < page_start + this.pagination_num && i < len; i++) {
                result.push(tx_array[i]);
            }
            var cnf = this.db_wallet.get_config_values();

            return {page: page, result: result, page_max: Math.ceil(len / this.pagination_num), sync_height: cnf.sync_height};
        }


    }
    
    async get_single_transaction(tx){
       var single_tx= this.db_wallet.get_single_tx(tx);
       for(var i=0;i<single_tx.send_from.length;i++){
           var label=await this.get_labels([single_tx.send_from[i].from_address]);
           single_tx.send_from[i].label=label[0];
           
       }
       for(var i=0;i<single_tx.destinations.length;i++){
           var label=await this.get_labels([single_tx.destinations[i].address]);
           single_tx.destinations[i].label=label[0];
           
       }
//       console.log(single_tx);
        return single_tx;
//       single_tx.label=get_labels(single_tx)
    }
      
    
    async send_transaction(hex,tx_object){
        this.socket.emit("send_raw_tx",hex,tx_object);             
    }
    
    create_transaction(destinations,fee,utxo_result,fee_only) {        
        var amount=numeral(0);
        for(var i=0;i<destinations.length;i++){
            amount.add(destinations[i].amount);
        }
        if(fee==undefined){fee=this.const_fee;}
        amount.add(fee);
              
        if(utxo_result==undefined){utxo_result= this.db_wallet.get_inputs_for_transaction(amount.value());}
        var utxo = utxo_result.array;
//        console.log("utxo_result:"+utxo_result);
        if(utxo_result != false && amount.value()>utxo_result.sum.value()){
            if(utxo_result.is_total){
                console.error("amount exeeds balance("+utxo_result.sum.value()+") by: "+(numeral(amount.value()).subtract(utxo_result.sum.value()).value()));              
                if(fee_only){return {exceed:numeral(amount.value()).subtract(utxo_result.sum.value()).value()};}
                else{return false;}
                
            }
            else{return this.create_transaction(destinations,fee,undefined,fee_only);}//new select with updated fee, when not all UTXOs are included
        }
        
        if (utxo_result != false) {
            var cnf=this.db_wallet.get_config_values();  
            var change_address=this.db_wallet.get_wallet_addresses(1,(cnf.used_pos.change+1),(cnf.used_pos.change+2))[0].address;
//            console.log("change_address: ",change_address);
            var tx_inputs=[];
            var full_addresses=this.get_full_addresses();
            
            for(var i=0;i<utxo.length;i++){
                var private_key=null;
                var public_key=null;
                for(var j=0;j<full_addresses.length;j++){
                    if(utxo[i].to_address==full_addresses[j].address){
                        private_key=full_addresses[j].privateKey;
                        public_key=full_addresses[j].publicKey;
                        break;
                    }
                }
                if(private_key!=null && public_key!=null){
                    tx_inputs.push({prev_tx:utxo[i].tx,input_index:utxo[i].num,script_pubkey:utxo[i].scriptPubKey,private_key:private_key,public_key:public_key})
                }
                else{console.error("no keys found for "+utxo[i].to_address);return false;}
            }

            
                
            var dest_copy=JSON.parse(JSON.stringify(destinations));
            var change_amount=numeral(utxo_result.sum.value()).subtract(amount.value()).value();
//            console.log("change_amount:"+change_amount);
            if(utxo_result.sum.value()!=amount.value()){
                
                
                dest_copy.push({destination_address: change_address, amount: change_amount});
                
            }    
//            console.log("dest_copy",dest_copy);    
            var prepared_tx={inputs:tx_inputs,outputs:dest_copy};                     
            var build_tx=this.wallet_functions.build_hex_transaction(prepared_tx);
//            console.log(build_tx);
            
            var tx_size=build_tx.length/2; // 2 hex len  -> 1 byte len 
            var total_fee=numeral((Math.ceil((tx_size+10)/1000))).multiply(this.const_fee).value();
            if(fee!=total_fee){
                console.error("fee to small: "+fee+ " < "+total_fee);
                return this.create_transaction(destinations,total_fee,utxo_result,fee_only);
            }
            else{
//                console.log("final fee: "+fee);
                return {hex:build_tx,fee:fee,tx_object:prepared_tx};
            }


        } else {          
            return false;
        }

    }
    
    get_full_addresses(){
        var cnf=this.db_wallet.get_config_values();  
        var private_standard_address_list=this.db_wallet.get_wallet_addresses(0,0,(cnf.used_pos.standard+1));
        var private_change_address_list=this.db_wallet.get_wallet_addresses(1,0,(cnf.used_pos.change+1));
        
        var full_addresses=[];
        
        for(var i=0;i<private_standard_address_list.length;i++){
            full_addresses.push(private_standard_address_list[i]);
        }
        
        for(var i=0;i<private_change_address_list.length;i++){
            full_addresses.push(private_change_address_list[i]);
        }
        
//         console.log(full_addresses);process.exit();
        return full_addresses;
        
       
     }
    
}
exports.aliwa_wallet = aliwa_wallet;