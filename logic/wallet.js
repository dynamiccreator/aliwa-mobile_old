class aliwa_wallet{
    addresses;
    transactions;
    unspent_outputs;
    balance;
    
    seed;
    db_wallet;
    wallet_functions;
    
     io;
     socket;
     
     addr_stan_pos=0;
     addr_change_pos=0;
     
     const_fee=0.0001;
     sync_state=null;
     gui_was_updated=false;
     sync_fails=0;
     pagination_num=10;
     sync_shift=0;
     
         
    constructor(){
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
        console.log(seed_words);
        var master_seed_string=null;
        if(seed_pw==null){master_seed_string=await this.wallet_functions.get_master_seed_string(seed_words);}
        else{master_seed_string=await this.wallet_functions.get_master_seed_string(seed_words,seed_pw);}
        console.log(master_seed_string);
        
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
    }
    
    //connect with server
    async connect_to_server(){
        //start the server for light wallet        
        var SocksProxyAgent = require('socks-proxy-agent');
        var agent = new SocksProxyAgent("socks://localhost:9050");    
        
        this.io = await require('socket.io-client');
        this.socket =  await this.io.connect('ws://aliwa5ld6pm66lbwb2kfyzvqzco24ihnmzoknvaqg4uqhpdtelnfa4id.onion:3000', { agent: agent });
//        this.socket =  await this.io.connect('ws://localhost:3000');

        this.socket.on('connect', async socket => {
             console.log("connected to server");
            // either with send()
            this.socket.send('hello');                              
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
//                console.log("##############SEND TX ANSWER: ",result);
//                console.log("send_array:"+JSON.stringify(result));
//                console.log("pure_message:",JSON.parse(result.message));
                
        var message=JSON.parse(result.message);
        if(message.result.length==64){    //only if result is a valid tx
            
            //update self sent                                                   
            this.db_wallet.update_self_sent_txs(message.result,result.data.inputs,result.data.outputs);
            //update transactions

            var cnf=this.db_wallet.get_config_values();
            var private_standard_address_list=this.db_wallet.get_wallet_addresses(0,0,(cnf.used_pos.standard+20));
            var private_change_address_list=this.db_wallet.get_wallet_addresses(1,0,(cnf.used_pos.change+20));
            this.db_wallet.update_transactions({from:cnf.sync_height+1,to:cnf.sync_height,inputs:[],outputs:[]},private_standard_address_list,private_change_address_list);
            this.save_wallet(null);
        }
        
                
            });
            
            this.socket.on('disconnect', async function () {
            // handle disconnect
            console.log("Server disconnected");          
            });                      
    }
    
    async disconnect(){
       await this.socket.disconnect();
       this.io=null;
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
        this.socket.emit('sync_from',cnf.sync_height, addresses,cnf.last_rewind);
//this.socket.emit('sync_from',0, addresses,cnf.last_rewind);
    }
    
    update_from_server(data){
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
       
        var cnf=this.db_wallet.get_config_values();  
//        console.log("pos before update: "+cnf.used_pos.standard);
        var private_standard_address_list=this.db_wallet.get_wallet_addresses(0,0,(cnf.used_pos.standard+20));
        var private_change_address_list=this.db_wallet.get_wallet_addresses(1,0,(cnf.used_pos.change+20));
        
        
        if(data.outputs!=undefined || data.inputs!=undefined){
            
            this.db_wallet.update_transactions(data,private_standard_address_list,private_change_address_list);
            
            
            this.db_wallet.update_config({sync_height:data.to,last_rewind:data.last_rewind});
//            console.log("pos AFTER update: "+cnf.used_pos.standard);
            
            
            if(this.addr_stan_pos < (cnf.used_pos.standard+20)  || this.addr_change_pos < (cnf.used_pos.change+20)){
                 this.sync();
            }
            else{
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
            },1000);
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
    async new_receive_address(label){
        
    }
    
    async change_receive_address_label(pos,label){
        var receive_addresses=this.db_wallet.get_receive_addresses();
        var selected_addr=receive_addresses.findOne({"pos": {'$aeq': pos}});
        selected_addr.label=label;
        receive_addresses.update(selected_addr);
    }
      
    async new_send_address(address,label){
        
    }
    
    async list_receive_addresses(page, order_field, direction) {
    // returns the number of all adresses + an array of addresses in standard order from page "page"  
    // (e.g. page 1 shows addresses 1-20) -> {num:84,addresses:[{address:"S...",label:"my example addresss"},{address:"S...",label:"my 2nd example addresss"}]}
        var txs = this.db_wallet.get_receive_addresses();
        var result = [];
        var tx_array = txs.chain().find().simplesort(order_field, {desc: direction}).data({forceClones: true, removeMeta: true});
        var len = tx_array.length;
        var page_start=page*20;
        for(var i=page_start;i<page_start+20 && i<len;i++){
            result.push(tx_array[i]);
        }
        return {page:page,result:result,page_max:Math.ceil(len/20)};   
    
    }
    
    get_highest_unused_receive_address(){
        var receive_addresses=this.db_wallet.get_receive_addresses();
        var latest_addr=receive_addresses.chain().find().simplesort("pos", {desc: true}).data({forceClones: true, removeMeta: true})[0];      
        return latest_addr;
    }
    
    //balance & transactions
    
    async get_balance(){
        var cnf=this.db_wallet.get_config_values(); 
        return cnf.balance;
        
    }
    
     list_transactions(page, order_field, direction) {
        // returns the number of all transactions 
        // + an array of transactions ordered by order_field in acsending or descending order based on direction from page "page" 
        // (e.g. page 1 shows transactions 1-20)
        var txs = this.db_wallet.get_txs();
        var result = [];
        var tx_array = txs.chain().find().simplesort(order_field, {desc: direction}).data({forceClones: true, removeMeta: true});
        var len = tx_array.length;
        var page_start=page*this.pagination_num;
        for(var i=page_start;i<page_start+this.pagination_num && i<len;i++){
            result.push(tx_array[i]);
        }
        var cnf=this.db_wallet.get_config_values(); 
        
        return {page:page,result:result,page_max:Math.ceil(len/this.pagination_num),sync_height:cnf.sync_height};


    }
    
    get_single_transaction(tx){
       return this.db_wallet.get_single_tx(tx);
    }
      
    
    async send_transaction(hex,tx_object){
        this.socket.emit("send_raw_tx",hex,tx_object);             
    }
    
    create_transaction(destinations,fee,utxo_result) {
        var amount=this.db_wallet.numeral(0);
        for(var i=0;i<destinations.length;i++){
            amount.add(destinations[i].amount);
        }
        if(fee==undefined){fee=this.const_fee;}
        amount.add(fee);
        
        if(utxo_result==undefined){utxo_result= this.db_wallet.get_inputs_for_transaction(amount.value());}
        var utxo = utxo_result.array;
        
        if(utxo_result != false && amount.value()>utxo_result.sum.value()){
            if(utxo_result.is_total){
                console.error("amount exeeds balance("+utxo_result.sum.value()+") by: "+(this.db_wallet.numeral(amount.value()).subtract(utxo_result.sum.value()).value()));
                return false;
            }
            else{return this.create_transaction(destinations,fee);}//new select with updated fee, when not all UTXOs are included
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
            var change_amount=this.db_wallet.numeral(utxo_result.sum.value()).subtract(amount.value()).value();
//            console.log("change_amount:"+change_amount);
            if(utxo_result.sum.value()!=amount.value()){
                
                
                dest_copy.push({destination_address: change_address, amount: change_amount});
                
            }    
//            console.log("dest_copy",dest_copy);    
            var prepared_tx={inputs:tx_inputs,outputs:dest_copy};                     
            var build_tx=this.wallet_functions.build_hex_transaction(prepared_tx);
//            console.log(build_tx);
            
            var tx_size=build_tx.length/2; // 2 hex len  -> 1 byte len 
            var total_fee=this.db_wallet.numeral((Math.ceil((tx_size+10)/1000))).multiply(this.const_fee).value();
            if(fee!=total_fee){
                console.error("fee to small: "+fee+ " < "+total_fee);
                return this.create_transaction(destinations,total_fee,utxo_result);
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