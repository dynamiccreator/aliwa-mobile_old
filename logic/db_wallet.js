class db_wallet {          
    constructor() { 
        this.wallet_loaded=false;
        this.db = new loki("no_path.db");
           
      // const wallet_functions_r=wallet_functions;
       this.wallet_functions=new wallet_functions();
       
       
//       var sep_linux = process.cwd().indexOf("/") > -1;
//       var sep = sep_linux ? "/" : "\\";
       this.default_path = "TESTNET_light_wallet.dat";//process.cwd() + sep + "aliwa_dat" + sep + "light_wallet.dat";
       
//        if (!fs.existsSync(process.cwd() + sep + "aliwa_dat")) {
//            fs.mkdirSync(process.cwd() + sep + "aliwa_dat");
//        }
       
    }

   async  read_database(path) {       
        if (path == null) {
            path = this.default_path;
        }

        try {          
            window.requestFileSystem(LocalFileSystem.PERSISTENT, 0,function (fs) {

                console.log('file system open: ' + fs.name);
                fs.root.getFile(path, {create: false, exclusive: false}, function (fileEntry) {

                    console.log("fileEntry is file?" + fileEntry.isFile.toString());
                    console.log("fileEntry.fullPath:", fileEntry.fullPath)
                    // fileEntry.name == 'someFile.txt'
                    // fileEntry.fullPath == '/someFile.txt'
                    readFile(fileEntry);                  
                }, function (e) {                    
                    console.log("onErrorReadFile", e);
                    temp_wallet_saver="---read error---";
                });
            }, function (e) {               
                console.log("onErrorLoadFs", e);
                temp_wallet_saver="---read error---";
            });


        } catch (err) {
            console.error(err);
            return "file not found";
        } 
        while(temp_wallet_saver=="file not found"){
            await sync_sleep(5); 
            if(temp_wallet_saver=="---read error---"){
                return "file not found";
            }
        }
//        console.log("database_string: ",temp_wallet_saver)
        return temp_wallet_saver;
    }

    async load_database(data, pw) {
        var salt = null;

        if (pw == null) {
            try {
                this.db.loadJSON(data);
            } catch (err) {
                console.error(err);
                return "password needed";
            }
        } else {
            var split_data = data.split(":");
            salt = split_data[0];
            data = split_data[1];

            var pw_hash = await this.get_argon2_password_data(pw, salt);

            var decrypted_database_string = aes256.decrypt(pw_hash.hash, data);
//            console.log(decrypted_database_string);
            try {
                this.db.loadJSON(decrypted_database_string);
            } catch (err) {
                console.error(err);
                return "wrong password";
            }
        }
        this.wallet_loaded=true;
        return true;
    }

    save_database(path, pw_hash, pw_salt) {        
        if (path == null) {
            path = this.default_path;
        }

        var database_string = this.db.serialize();


        if (pw_hash != null) {
            database_string = pw_salt + ":" + aes256.encrypt(pw_hash, database_string);
        }

        try {
          //  fs.writeFileSync(path, database_string);
          temp_wallet_saver=database_string;
          window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, function (fs) {

                console.log('file system open: ' + fs.name);
                fs.root.getFile(path, {create: true, exclusive: false}, function (fileEntry) {

                    console.log("fileEntry is file?" + fileEntry.isFile.toString());
                    console.log("fileEntry.fullPath:",fileEntry.fullPath)
                    // fileEntry.name == 'someFile.txt'
                    // fileEntry.fullPath == '/someFile.txt'
                   writeFile(fileEntry, database_string);

                }, function(e){console.log("onErrorCreateFile",e);});

            }, function(e){console.log("onErrorLoadFs",e);});
          
        } catch (err) {
            console.error(err);
            return false;
        }
        return true;
    }

    async get_argon2_password_data(pw, salt) {

        if (salt == null) {
            var my_number_array = new Uint8Array(64);
            salt = crypto.getRandomValues(my_number_array);    
            salt=intArray_to_hex_string(salt);           
        }
        salt =hexStringToByte(salt);      
        try {
//              var hash = await argon2.hash(pw, {salt: salt, timeCost: "12", memoryCost: "24000", type: argon2.argon2id, version: 0x13, raw: true});
              var hash = await hashwasm.argon2id({
                password: pw,
                salt, // salt is a buffer containing random bytes
                parallelism: 1,
                iterations: 12, //12,
                memorySize: 24000, // use 24MB memory
                hashLength: 32, // output size = 32 bytes
                outputType: 'hex', // return standard encoded string containing parameters needed to verify the key
            }); 
            
//            console.log("get_argon2_password_data:--------------------");
//            console.log(hash.toString("hex") + " | " + salt.toString("hex"));
//            hash = hash.toString("hex");
            salt = intArray_to_hex_string(salt);
            return {hash: hash, salt: salt};

        } catch (err) {
            console.error(err);
            return false;
        }
    }

    update_config(update_entries) {
        var config = this.db.getCollection("config");
        if (config == null) {
            console.log("new wallet config");
            var config = this.db.addCollection("config");
        }
        if (config.get(1) == null) {
            console.log("insert new config");
            config.insert({name: "config"});
        }

        //console.log("update config");
        var doc = config.get(1);

        for (const [key, value] of Object.entries(update_entries)) {
//            console.log(`${key}: ${value}`);
            doc[key] = value;
        }

        config.update(doc);

    }

    get_config_values() {
        var config = this.db.getCollection("config");
        if (config == null) {
            return false;
        }
        var doc = config.get(1);
        return doc;
    }

    get_password() {

    }

    set_password() {

    }

    update_transactions(data, private_standard_address_list,private_change_address_list,initial_sync) {
                
        var full_addresses=[];
        
        for(var i=0;i<private_standard_address_list.length;i++){
            full_addresses.push(private_standard_address_list[i]);
        }
        
        for(var i=0;i<private_change_address_list.length;i++){
            full_addresses.push(private_change_address_list[i]);
        }

        var transactions = this.db.getCollection("transactions");
        if (transactions == null) {         
            transactions = this.db.addCollection("transactions", {unique: ["tx"]});
        }


         //delete orphans
         if(data.from <= this.get_config_values().sync_height && !initial_sync){
             console.log("DELETE ORPHANS from "+data.from)
            this.delete_orphans(data.from);
         }
         
         
        var temp_outputs = this.db.addCollection("temp_outputs", {unique: ["combined_key"]});
        for (var i = 0; i < data.outputs.length; i++) {
            data.outputs[i].combined_key = data.outputs[i].tx + ":" + data.outputs[i].num;
            try {
                temp_outputs.insert(data.outputs[i]);
            } catch (e) {
                console.log("duplicate output");
                console.log(e);
            }
        }


        var temp_inputs = this.db.addCollection("temp_inputs", {unique: ["combined_key"]});
        for (var i = 0; i < data.inputs.length; i++) {
            data.inputs[i].combined_key = data.inputs[i].tx + ":" + data.inputs[i].in_index;
            try {
                temp_inputs.insert(data.inputs[i]);
            } catch (e) {
                console.log("duplicate input");
                console.log(e);
            }
        }
        
        //self sent
        var db_self_sent_inputs = this.db.getCollection("db_self_sent_inputs");
        if (db_self_sent_inputs == null) {   
            console.log("db_self_sent_inputs is null!")
            db_self_sent_inputs = this.db.addCollection("db_self_sent_inputs", {unique: ["combined_key"]});                     
        }
        
        var db_self_sent_outputs = this.db.getCollection("db_self_sent_outputs");
        if (db_self_sent_outputs == null) {   
            console.log("db_self_sent_outputs is null!")
            db_self_sent_outputs = this.db.addCollection("db_self_sent_outputs", {unique: ["combined_key"]});                     
        }
        
        //mempool
        var db_mempool_outputs = this.db.getCollection("db_mempool_outputs");
        if (db_mempool_outputs == null) {   
            console.log("db_mempool_outputs is null!")
            db_mempool_outputs = this.db.addCollection("db_mempool_outputs", {unique: ["combined_key"]});                     
        }
        
        
//        console.log(temp_inputs.find());
//        console.log(temp_outputs.find());
        
        //update inputs and outputs
        this.sub_update_ins_and_outs(temp_inputs,temp_outputs);
        
        //clear temp
        temp_inputs.clear({removeIndices:true});
        temp_outputs.clear({removeIndices:true});
        
        //clear tx
        var old_txs=transactions.chain().find().data({forceClones: true,removeMeta:true});
        var notification_txs=[];
        transactions.clear({removeIndices:true});
        
        //fill temp with all blockchain ins and outs
        var db_inputs = this.db.getCollection("inputs");
        var db_outputs = this.db.getCollection("outputs");
        temp_inputs.insert(db_inputs.chain().find().data({forceClones: true,removeMeta:true}));
        temp_outputs.insert(db_outputs.chain().find().data({forceClones: true,removeMeta:true}));
        
        //fill temp with mempool and self_send
        //....
        //first remove all mempool and self_send ins and outs which are found in blockchain ins and outs
        //remove from mempool where found in self send
       
        
        
        
        //
        //then fill
        //......................................
        
        
        var inputs_data=temp_inputs.chain().find().data({forceClones: true,removeMeta:true});
        var outputs_data=temp_outputs.chain().find().data({forceClones: true,removeMeta:true});
        
        //clean self sent and mempool from blockchain txs
        for(var i=0;i<inputs_data.length;i++){
            if(db_self_sent_inputs.findOne({tx: {'$aeq': inputs_data[i].tx}}) != null){
                db_self_sent_inputs.findAndRemove({tx: {'$aeq': inputs_data[i].tx}});
            }
        }
        
        for(var i=0;i<outputs_data.length;i++){
            if(db_self_sent_outputs.findOne({tx: {'$aeq': outputs_data[i].tx}}) != null){
                db_self_sent_outputs.findAndRemove({tx: {'$aeq': outputs_data[i].tx}});
            }
            if(db_mempool_outputs.findOne({tx: {'$aeq': outputs_data[i].tx}}) != null){
                db_mempool_outputs.findAndRemove({tx: {'$aeq': outputs_data[i].tx}});
            }
        }
        
        //clean mempool where found in self_sent
        var self_sent_outputs=db_self_sent_outputs.chain().find().data({forceClones: true,removeMeta:true});
        
        for(var i=0;i<self_sent_outputs.length;i++){
            if(db_mempool_outputs.findOne({tx: {'$aeq': self_sent_outputs[i].tx}}) != null){
                db_mempool_outputs.findAndRemove({tx: {'$aeq': self_sent_outputs[i].tx}});
            }          
        }
        
        
        
        // add not yet included txs       
        temp_inputs.insert(db_self_sent_inputs.chain().find().data({forceClones: true,removeMeta:true}));
        temp_outputs.insert(db_self_sent_outputs.chain().find().data({forceClones: true,removeMeta:true}));
        
        temp_outputs.insert(db_mempool_outputs.chain().find().data({forceClones: true,removeMeta:true}));
        
               
        //update array
        inputs_data=temp_inputs.chain().find().data({forceClones: true,removeMeta:true});
        outputs_data=temp_outputs.chain().find().data({forceClones: true,removeMeta:true});
        
        
        
        var temp_tx_list = this.db.addCollection("temp_tx_list", {unique: ["tx"]});
        for (var i = 0; i < inputs_data.length; i++) {
            try {
                temp_tx_list.insert({tx: inputs_data[i].tx});
            } catch (e) {
//                console.error(e);
            }
        }

        for (var i = 0; i < outputs_data.length; i++) {
            try {
                temp_tx_list.insert({tx: outputs_data[i].tx});
            } catch (e) {
//                console.error(e);
            }
        }
        
        var tx_list_arr = temp_tx_list.find();
//       console.log(tx_list_arr);process.exit(); 
        var tx_sum = numeral(0);      
        var balance_available= numeral(0);
        var balance_total= numeral(0);
        for (var i = 0; i < tx_list_arr.length; i++) {
            try {
                var temp_tx = temp_tx_list.findOne({'tx': {'$aeq': tx_list_arr[i].tx}});
                temp_tx.inputs = temp_inputs.chain().find({tx: {'$aeq': tx_list_arr[i].tx}}).simplesort("in_index").data({forceClones: true, removeMeta: true});
                temp_tx.outputs = temp_outputs.chain().find({tx: {'$aeq': tx_list_arr[i].tx}}).simplesort("num").data({forceClones: true, removeMeta: true});
                temp_tx.wallet = {};


                temp_tx.wallet.tx = tx_list_arr[i].tx;
                temp_tx.wallet.self_balance = numeral(0);
                temp_tx.wallet.fee = numeral(0);
                temp_tx.wallet.is_self = false;
                temp_tx.wallet.mature = -1;


                for (var j = 0; j < temp_tx.inputs.length; j++) {
                            
                    var matching_output = temp_outputs.findOne({'$and': [{"tx": {'$aeq': temp_tx.inputs[j].from_tx}}, {"num": {'$aeq': temp_tx.inputs[j].from_vout}}]});
                    if (matching_output != null) {
                        temp_tx.inputs[j].value = matching_output.value;
                        temp_tx.inputs[j].from_address = matching_output.to_address;
                        temp_tx.inputs[j].scriptPubKey = matching_output.scriptPubKey;

                        //fee
                        temp_tx.wallet.fee.add(temp_tx.inputs[j].value);
                    } else {
//                        console.error("no output found for tx:" + tx_list_arr[i].tx + " | input index: " + j);
                    }

                    if (temp_tx.wallet.time == undefined) {
                        temp_tx.wallet.time = temp_tx.inputs[j].time;
                    }
                    if (temp_tx.wallet.height == undefined) {
                        temp_tx.wallet.height = temp_tx.inputs[j].create_height;
                    }
                    if (temp_tx.wallet.blockhash == undefined) {
                        temp_tx.wallet.blockhash = temp_tx.inputs[j].blockhash;
                    }

                    if (temp_tx.wallet.send_from == undefined) {
                        temp_tx.wallet.send_from = [];
                    }

                    var is_self = false;
                    var address_type=-1;
                    for (var x = 0; x < full_addresses.length; x++) {
                        if (full_addresses[x].address == temp_tx.inputs[j].from_address) {
                            is_self = true;
                            address_type=full_addresses[x].type;
                            break;
                        }
                    }
                    if (is_self) {
                        temp_tx.wallet.self_balance.subtract(temp_tx.inputs[j].value);
                        temp_tx.wallet.is_self = true;

                        balance_total.subtract(temp_tx.inputs[j].value);
                        balance_available.subtract(temp_tx.inputs[j].value);                      
                    }
                    temp_tx.wallet.send_from.push({from_address: temp_tx.inputs[j].from_address, value: temp_tx.inputs[j].value, self: is_self,address_type:address_type});

                }

                for (var j = 0; j < temp_tx.outputs.length; j++) {

                    //fee
                    temp_tx.wallet.fee.subtract(temp_tx.outputs[j].value);

                    var is_self = false;
                    var address_type=-1;
                    for (var x = 0; x < full_addresses.length; x++) {
                        if (full_addresses[x].address == temp_tx.outputs[j].to_address) {
                            is_self = true;
                            address_type=full_addresses[x].type;
                            break;
                        }
                    }

                    if (temp_tx.wallet.time == undefined) {
                        temp_tx.wallet.time = temp_tx.outputs[j].time;
                    }
                    if (temp_tx.wallet.height == undefined) {
                        temp_tx.wallet.height = temp_tx.outputs[j].create_height;
                    }
                    if (temp_tx.wallet.blockhash == undefined) {
                        temp_tx.wallet.blockhash = temp_tx.outputs[j].blockhash;
                    }

                    if (temp_tx.wallet.destinations == undefined) {
                        temp_tx.wallet.destinations = [];
                    }

                   
//                   var redeemed=temp_inputs.findOne({'$and': [{"from_tx": {'$aeq': temp_tx.outputs[j].tx}}, {"from_vout": {'$aeq': temp_tx.outputs[j].num}}]});
//                   redeemed= redeemed != null ? {tx:redeemed.tx,num:redeemed.from_vout,height:redeemed.create_height} : null;

                    if (temp_tx.outputs[j].value == 0 && temp_tx.outputs[j].scriptPubKey.startsWith("6a026e706a")) {
                        temp_tx.wallet.destinations[temp_tx.wallet.destinations.length - 1] = ({address: temp_tx.outputs[j].to_address, value: temp_tx.outputs[j-1].value, self: is_self,address_type:address_type, note: hex_to_ascii(temp_tx.outputs[j].scriptPubKey.substring(12))});
                    } else {
                        temp_tx.wallet.destinations.push({address: temp_tx.outputs[j].to_address, value: temp_tx.outputs[j].value, self: is_self,address_type:address_type});
                    }

                    temp_tx.wallet.mature = temp_tx.outputs[j].mature;

                    if (is_self) {
                        temp_tx.wallet.self_balance.add(temp_tx.outputs[j].value);
                        temp_tx.wallet.is_self = true;
                                               
                        balance_total.add(temp_tx.outputs[j].value);
                        if ((temp_tx.wallet.mature == 0 && temp_tx.wallet.height < (data.to - 450)) || (temp_tx.wallet.mature == 1 && temp_tx.wallet.height <= data.to) /*|| (temp_tx.wallet.mature == 1 && temp_tx.wallet.height < (data.to - 6))*/) {
                            balance_available.add(temp_tx.outputs[j].value);
                        } 
                    }
                }

                temp_tx.wallet.self_balance = temp_tx.wallet.self_balance.format('0.00000000');
                temp_tx.wallet.fee = temp_tx.wallet.fee.format('0.00000000');


                temp_tx_list.update(temp_tx);

                ////only add self txs
                if (temp_tx.wallet.is_self && transactions.findOne({tx: {'$aeq': temp_tx.wallet.tx}}) == null) {
                    try {
                        transactions.insert(temp_tx.wallet);
                    } catch (e) {
                        console.error("could not insert transaction: \n", e)
                    }

                } else {
                    //  console.log(temp_tx.wallet.is_self + " transaction " + temp_tx.wallet.tx + " already exists\n", transactions.findOne({tx: {'$aeq': temp_tx.wallet.tx}}));
                }
                
                //notifications
                var is_new_tx=true;
                for(var no=0;no<old_txs.length;no++){
                    if(old_txs[no].tx==temp_tx.wallet.tx){
                        is_new_tx=false;                      
                        break;
                    }
                }
                if(temp_tx.wallet.is_self && is_new_tx && temp_tx.wallet.time > (Math.floor((new Date()).getTime() / 1000)-24*3600))
                {
                    notification_txs.push({time:temp_tx.wallet.time,
                    title:("ALIAS "+(numeral(temp_tx.wallet.self_balance).value()>0 ? "received" : "sent")),
                    body:((numeral(temp_tx.wallet.self_balance).value()>0 ? "+" : "")+numeral(temp_tx.wallet.self_balance).format("0.00[000000]"))});
                }
                
                

            } catch (e) {
                console.error(e);
            }
//            console.log("tx:" + tx_list_arr[i].tx + "############################");
            var my_self_balance = temp_tx_list.findOne({tx: {'$aeq': tx_list_arr[i].tx}}).wallet.self_balance;
            tx_sum.add(parseFloat(my_self_balance));
        }
        
        var balance_unconfirmed= numeral(0);
        balance_unconfirmed.add(balance_total.value());
        balance_unconfirmed.subtract(balance_available.value());
//        console.log("balance_unconfirmed: "+balance_unconfirmed.format('0.00000000'));
//        console.log("balance_available: "+balance_available.format('0.00000000'));
//        console.log("balance_total: "+balance_total.format('0.00000000'));
        this.update_config({balance:{unconfirmed:balance_unconfirmed.format('0.00000000'),available:balance_available.format('0.00000000'),total:balance_total.format('0.00000000')}});
        

     /*   var trans_arr = transactions.chain().find().simplesort("height", {desc: true}).data({forceClones: true});
//        console.log("######TX NUM= " + trans_arr.length);
        for (var i = 0, len = trans_arr.length; i < len; i++) {
            var tx_time = new Date(trans_arr[i].time * 1000);
            var to_addr_string = "";
            if (trans_arr[i].destinations != undefined) {
                for (var j = 0; j < trans_arr[i].destinations.length; j++) {
                    to_addr_string += trans_arr[i].destinations[j].address + " : " + trans_arr[i].destinations[j].value + " , ";
                }
            }
//            console.log(tx_time.toLocaleString()+": "+parseFloat(trans_arr[i].self_balance)+" | "+to_addr_string+"fee : "+trans_arr[i].fee+"\n");
//            console.log(trans_arr[i]);
        }

        console.log("TOTAL BALANCE = " + tx_sum.format('0.00000000') + "\n\n");*/

        this.update_used_addresses(temp_outputs,full_addresses);
        this.update_unspent_outputs(temp_inputs,temp_outputs,full_addresses,data.to);
        
        this.update_transaction_views(transactions);
        
        this.db.removeCollection("temp_inputs");
        this.db.removeCollection("temp_outputs");
        this.db.removeCollection("temp_tx_list");
        
        
        //notifications
        var db_notifications = this.db.getCollection("db_notifications");
        if (db_notifications == null) {   
            console.log("db_notifications is null!")
            db_notifications = this.db.addCollection("db_notifications");                     
        }
        db_notifications.clear({removeIndices:true});//clean old notifications
        for(var i=0;i<notification_txs.length;i++){
            db_notifications.insert(notification_txs[i]);
//            console.log(notification_txs[i]);
        }
        
//        var last_Sdr=db_outputs.chain().find({"to_address": {'$aeq': "SdrdWNtjD7V6BSt3EyQZKCnZDkeE28cZhr"}}).simplesort("time", {desc: true}).limit(5).data({forceClones: true});
//        console.log(last_Sdr)
            
    }
    
    delete_orphans(height){
        var db_inputs = this.db.getCollection("inputs");
        if (db_inputs == null) {                
            db_inputs = this.db.addCollection("inputs", {unique: ["combined_key"]});
        }
        
        var db_outputs = this.db.getCollection("outputs");
        if (db_outputs == null) {           
            db_outputs = this.db.addCollection("outputs", {unique: ["combined_key"]});
        }
        
//         var transactions = this.db.getCollection("transactions");
//        if (transactions == null) {
//            console.log("new wallet config");
//            transactions = this.db.addCollection("transactions", {unique: ["tx"]});
//        }
        
        //delete orphans
//        transactions.findAndRemove({'height': {'$gte': height}});// is cleared completely anyway
        db_inputs.findAndRemove({'create_height': {'$gte': height}});
        db_outputs.findAndRemove({'create_height': {'$gte': height}});                    
    }
    
    sub_update_ins_and_outs(temp_inputs,temp_outputs){
        var db_inputs = this.db.getCollection("inputs");
        if (db_inputs == null) {                
            db_inputs = this.db.addCollection("inputs", {unique: ["combined_key"]});
        }
        
        var db_outputs = this.db.getCollection("outputs");
        if (db_outputs == null) {           
            db_outputs = this.db.addCollection("outputs", {unique: ["combined_key"]});
        }
        
        var t_inputs_arr=temp_inputs.chain().find().data({forceClones: true,removeMeta:true});       
        for(var i=0,len=t_inputs_arr.length;i<len;i++){    
            try {
                db_inputs.insert(t_inputs_arr[i]);
            } catch (e) {
                console.error("insert inputs: \n",e);
            }

            
        }
        var t_outputs_arr=temp_outputs.chain().find().data({forceClones: true,removeMeta:true});
        for(var i=0,len=t_outputs_arr.length;i<len;i++){                          
            try {
                db_outputs.insert(t_outputs_arr[i]);
            } catch (e) {
                console.error("insert outputs: \n",e);
            }

        }
    }
    
    update_used_addresses(temp_outputs,full_addresses){
        
        var pure_addresses = [];
        for (var i = 0; i < full_addresses.length; i++) {
            pure_addresses.push(full_addresses[i].address);
        }
        
        var highest_used_standard=-1;
        var highest_used_change=-1;
        
//        var lowest_unused_standard=-1;
        
        var list=temp_outputs.chain()
            .find({'to_address': {'$in': pure_addresses}})
            .data({forceClones: true,removeMeta:true});
//        console.log(list);
        for(var i = 0, len = list.length; i < len; i++) {
           
            for (var j = 0; j < full_addresses.length; j++) {
//                console.log(full_addresses[j]);
                //lowest unused
//                if(list[i].to_address == full_addresses[j].address && full_addresses[j].type == 0){
//                    if(full_addresses[j].pos == (lowest_unused_standard+1)){
//                        lowest_unused_standard = full_addresses[j].pos+1;
//                    }
//                    
//                }

                if (list[i].to_address == full_addresses[j].address && full_addresses[j].pos > highest_used_standard && full_addresses[j].type == 0) {
                    highest_used_standard = full_addresses[j].pos;
                }
                if (list[i].to_address == full_addresses[j].address && full_addresses[j].pos > highest_used_change && full_addresses[j].type == 1) {
                    highest_used_change = full_addresses[j].pos;
                }
            }
        }
        
        this.update_config({used_pos:{standard:highest_used_standard+1,change:highest_used_change+1}});
        this.update_addressbook_receive(highest_used_standard);
        
    }
    
    update_addressbook_receive(highest_used_standard){
        var db_addressbook_receive = this.db.getCollection("addressbook_receive");
        if (db_addressbook_receive == null) {           
            db_addressbook_receive = this.db.addCollection("addressbook_receive", {unique: ["pos"]});
        }
              
        var private_standard_address_list=this.get_wallet_addresses(0,0,highest_used_standard+2);
               
        for(var i=0;i<private_standard_address_list.length;i++){
            if(db_addressbook_receive.findOne({pos: {'$aeq': private_standard_address_list[i].pos}}) == null){
                db_addressbook_receive.insert({pos:private_standard_address_list[i].pos,address:private_standard_address_list[i].address,label:(i==0 ? "Default Receiving Address" : null)});
                console.log("insert new address HD# "+(private_standard_address_list[i].pos+1)+"to address_book: "+private_standard_address_list[i].address+" | "+private_standard_address_list[i].pos);
            }
        }
    }
    
    update_unspent_outputs(temp_inputs,temp_outputs,full_addresses,to){
        //rebuild unspent outputs from updated (inputs&outputs, confirmed only) , selfsend(inputs&outputs, unconfirmed) // and mempool(outputs,unconfirmed)
        var pure_addresses = [];
        for (var i = 0; i < full_addresses.length; i++) {
            pure_addresses.push(full_addresses[i].address);
        }

        var my = temp_outputs.find({'to_address': {'$in': pure_addresses}});

        var inputs = [];
        for (var i = 0; i < my.length; i++) {
            var find_matching = temp_inputs.find({'$and': [
                    {"from_tx": {'$aeq': my[i].tx}},
                    {"from_vout": {'$aeq': my[i].num}}
                ]});
            if (find_matching.length > 0) {
                inputs.push(find_matching[0]);
            }
        }

        temp_outputs.findAndRemove({'to_address': {'$nin': pure_addresses}});
        for (var i = 0; i < inputs.length; i++) {
            temp_outputs.findAndRemove({'$and': [
                    {"tx": {'$aeq': inputs[i].from_tx}},
                    {"num": {'$aeq': inputs[i].from_vout}}
                ]});
        }

        var sum = 0;
        var all_unspent_outputs = temp_outputs
            .chain()
            .find({'$and': [{'to_address': {'$in': pure_addresses}},{'value': {'$gt': 0}}]})
            .data({forceClones: true,removeMeta:true});
//        console.log("all_unspent_outputs")
//        console.log(all_unspent_outputs);
//        process.exit();
        for (var i = 0; i < all_unspent_outputs.length; i++) {
//           console.log(all_unspent_outputs[i])
            sum += all_unspent_outputs[i].value;
        }
//        console.log("BALANCE = " + Number.parseFloat(sum).toFixed(8) + " | " + all_unspent_outputs.length);

        var db_unspent = this.db.getCollection("unspent");
        if (db_unspent == null) {           
            db_unspent = this.db.addCollection("unspent", {unique: ["combined_key"]});
        }
        db_unspent.clear({removeIndices:true});
        db_unspent.insert(all_unspent_outputs);
        //remove unconfirmed UTXO
        db_unspent.findAndRemove({'create_height': {'$gt': (to)}}); //self sent / mempool tx
        db_unspent.findAndRemove({'$and': [{'mature': {'$aeq': 0}},{'create_height': {'$gt': (to-449)}}]}); //staking tx
//        db_unspent.findAndRemove({'$and': [{'mature': {'$aeq': 1}},{'create_height': {'$gt': (to-5)}}]}); // normal tx
                                        
    }
    
    update_transaction_views(transactions){
        var db_transaction_views = this.db.getCollection("transaction_views");
        if (db_transaction_views == null) {           
            db_transaction_views = this.db.addCollection("transaction_views", {unique: ["combined_key"]});
        }
        db_transaction_views.clear({removeIndices:true});
        var trans_copy=transactions.chain().find().data({forceClones: true,removeMeta:true});
        if (trans_copy != null) {
            for (var i = 0, len = trans_copy.length; i < len; i++) {
//                console.log(trans_copy[i]);
//                console.log("*************************"+i);
                var tx = trans_copy[i].tx;
                var value = trans_copy[i].self_balance;
                if (trans_copy[i].self_balance == -trans_copy[i].fee && trans_copy[i].send_from!=undefined) { //sent to self 
                    var destinations = trans_copy[i].destinations;
                    if (destinations != null) {
                        var has_note=false;
                        for (var j = 0; j < destinations.length; j++) {
                            if(destinations[j].self && destinations[j].note!=undefined){
                                db_transaction_views.insert({tx: trans_copy[i].tx, num: j, combined_key: (tx + ":" + 0), time: trans_copy[i].time, human_time: (new Date(numeral(trans_copy[i].time).multiply(1000).value()).toLocaleString()),height: trans_copy[i].height,
                                    type: "self sent", address: "(n/a)", value: ((value>=0 ? "+" : "")+numeral(value).format("0.00[000000]")),note:destinations[j].note, mature:trans_copy[i].mature,blockhash:trans_copy[i].blockhash});
                                has_note=true;
                                break;
                            }
                        }
                        if(!has_note){
                            db_transaction_views.insert({tx: trans_copy[i].tx, num: j, combined_key: (tx + ":" + 0), time: trans_copy[i].time, human_time: (new Date(numeral(trans_copy[i].time).multiply(1000).value()).toLocaleString()),height: trans_copy[i].height,
                                type: "self sent", address: "(n/a)", value: ((value>=0 ? "+" : "")+numeral(value).format("0.00[000000]")), mature:trans_copy[i].mature,blockhash:trans_copy[i].blockhash});
                            }
                        }
                    }
                else if(parseFloat(trans_copy[i].self_balance)> 0){ //received with
                    var destinations = trans_copy[i].destinations;
                    if (destinations != null) {
                        var first_used = false;
                        for (var j = 0; j < destinations.length; j++) {
                            if (destinations[j].self && destinations[j].address_type==0) {
                                db_transaction_views.insert({tx: trans_copy[i].tx, num: j, combined_key: (tx + ":" + j), time: trans_copy[i].time, human_time: (new Date(numeral(trans_copy[i].time).multiply(1000).value()).toLocaleString()), height: trans_copy[i].height,
                                type: trans_copy[i].mature== 0 ? "staked" : "received", address: destinations[j].address, value: "+"+numeral(destinations[j].value).format("0.00[000000]"),note:destinations[j].note, mature:trans_copy[i].mature,blockhash:trans_copy[i].blockhash});
                            }
                        }
                    }
                }                             
                else { // sent to
                    var destinations = trans_copy[i].destinations;
                    if (destinations != null) {
                        var first_used = false;
                        for (var j = 0; j < destinations.length; j++) {
                            //var value= (j==0 ? numeral(send_from[j].value) : send_from[j].value );
                            if (!destinations[j].self) {
                                var value = destinations[j].value;
                                if (!first_used) {
                                    value = numeral(destinations[j].value).add(trans_copy[i].fee).value();
                                    first_used = true;
                                }
                                db_transaction_views.insert({tx: trans_copy[i].tx, num: j, combined_key: (tx + ":" + j), time: trans_copy[i].time, human_time: (new Date(numeral(trans_copy[i].time).multiply(1000).value()).toLocaleString()), height: trans_copy[i].height,
                                    type: "sent", address: destinations[j].address, value: "-"+numeral(value).format("0.00[000000]"),note:destinations[j].note, mature:trans_copy[i].mature,blockhash:trans_copy[i].blockhash});
                            }
                        }//end of j-for
                    }
                }
            }//end of i-for
            
//            console.log(db_transaction_views.chain().find().simplesort("height", {desc: true}).data({forceClones: true, removeMeta: true}));
            
        }
    }
    
   /* add_addressbook_receive_address(label){            
        var db_addressbook_receive = this.db.getCollection("addressbook_receive");
        if (db_addressbook_receive == null) {           
            db_addressbook_receive = this.db.addCollection("addressbook_receive", {unique: ["pos"]});
        }
        
        var config = this.get_config_values();
        
        var address_list=db_addressbook_receive.chain().find().simplesort("pos").data({forceClones: true, removeMeta: true});
        var highest_pos=0;
        if(address_list!=null){
            highest_pos=address_list[address_list.length-1].pos;
        }
        
        if(highest_pos-1>=config.used_pos.standard+20){
            return false;
        }
        
        var private_standard_address_list=this.get_wallet_addresses(0,highest_pos+1,highest_pos+2);
        
               
        for(var i=0;i<private_standard_address_list.length;i++){
            if(db_addressbook_receive.findOne({pos: {'$aeq': private_standard_address_list[i].pos}}) == null){
                db_addressbook_receive.insert({pos:private_standard_address_list[i].pos,address:private_standard_address_list[i].address,label:label});
                console.log("insert new address HD#"+(i+1)+"to address_book: "+private_standard_address_list[i].address+" | "+private_standard_address_list[i].pos);
            }
        }
        return true;
    }*/
        
     get_contact_addresses(){
         var db_addressbook_contact = this.db.getCollection("contact_address_book");
        if (db_addressbook_contact == null) {           
            db_addressbook_contact = this.db.addCollection("contact_address_book", {unique: ["pos"]});                               
        }
                 
         return this.db.getCollection("contact_address_book");  
    }
    
    change_label_addressbook_receive_address(pos,label){
         var db_addressbook_receive = this.db.getCollection("addressbook_receive");
         var obj=db_addressbook_receive.findOne({pos: {'$aeq': pos}});
         if(obj!=null){
             obj.label=label;
           db_addressbook_receive.update(obj);
           return true;
         }
         return false;
    }
    
    get_inputs_for_transaction(amount){
        var db_unspent = this.db.getCollection("unspent");
        if (db_unspent == null) {   
            console.log("unspent is null!")
            db_unspent = this.db.addCollection("unspent", {unique: ["combined_key"]});
        }
        var config = this.get_config_values();
//        console.log(db_unspent.find());

//        console.log("random: "+(crypto.randomInt(0,(Math.pow(2,48)-2))/(Math.pow(2,48)-1)));
//        var unspent_arr=db_unspent.find().sort( () => Math.random() - 0.5) ;
        
        var unspent_arr_fully=db_unspent.find({'$or':
                    [{'$and': [{'mature': {'$aeq': 1}},{'create_height': {'$gt': (config.sync_height-5)}}]},
                     {'mature' : {'$aeq': 0}}]});
                    //.sort( () => (crypto.randomInt(0,(Math.pow(2,48)-2))/(Math.pow(2,48)-1)) - 0.5) ;
            shuffleArray(unspent_arr_fully);
        var unspent_arr=db_unspent.find();//.sort( () => (crypto.randomInt(0,(Math.pow(2,48)-2))/(Math.pow(2,48)-1)) - 0.5) ;
            shuffleArray(unspent_arr);
               
        var balance=config.balance.available;
        var dust_threshold=balance < 0.002 ? 0 : (balance < 0.02 ? 0.001 : (balance < 0.2 ? 0.01 : (balance < 2 ? 0.1 : (balance < 20 ? 0.1 : 1)))); 
        var collector={};
        
        
        collector.sum=numeral(0);
        collector.array=[];
        
        //first try to select only from fully confirmed utxos
        //try to find exact match
        for (var i = 0; i < unspent_arr_fully.length; i++) {
            if (unspent_arr_fully[i].value == amount) {
                collector.sum.add(unspent_arr_fully[i].value);
                collector.array.push(unspent_arr_fully[i]);
                collector.is_total = false;
                return collector;
            }
        }
               
        var i=0;
        while((collector.sum.value()<amount || (collector.sum.value()-amount)<dust_threshold && i<4) && collector.sum.value()!=balance && collector.sum.value()!=amount && i<unspent_arr_fully.length){
            collector.sum.add(unspent_arr_fully[i].value);
            collector.array.push(unspent_arr_fully[i]);     
            i++;           
        }
        collector.is_total=false;
        if(collector.sum.value()>=amount){return collector;}
        
             
        //*** select from all available utxo (1 conf. min.)
        collector.sum=numeral(0);
        collector.array=[];
        
        if(amount>balance){
            console.error("amount exeeds balance: "+ amount +" > "+balance);
            return false;}
        
        //try to find exact match
        for (var i = 0; i < unspent_arr.length; i++) {
            if (unspent_arr[i].value == amount) {
                collector.sum.add(unspent_arr[i].value);
                collector.array.push(unspent_arr[i]);
                collector.is_total = (collector.array.length == unspent_arr.length);
                return collector;
            }
        }
              
        var i=0;
        while((collector.sum.value()<amount || (collector.sum.value()-amount)<dust_threshold) && collector.sum.value()!=balance && collector.sum.value()!=amount && i<unspent_arr.length){
            collector.sum.add(unspent_arr[i].value);
            collector.array.push(unspent_arr[i]);     
            i++;           
        }
        collector.is_total=(collector.array.length==unspent_arr.length);
//        console.log(collector);
        return collector;
    }
    
    get_receive_addresses(){
        var db_addressbook_receive = this.db.getCollection("addressbook_receive");
        if (db_addressbook_receive == null) {           
            db_addressbook_receive = this.db.addCollection("addressbook_receive", {unique: ["pos"]});                               
        }
        
        return this.db.getCollection("addressbook_receive");  
    }
    
    get_txs() {
//        return this.db.getCollection("transactions");
        var db_transaction_views = this.db.getCollection("transaction_views");
        if (db_transaction_views == null) {
            db_transaction_views = this.db.addCollection("transaction_views", {unique: ["combined_key"]});
        }
        return db_transaction_views;
    }
    
    get_single_tx(tx){
        var single_tx=this.db.getCollection("transactions").findOne({"tx": {'$aeq': tx}});
        return single_tx;
         
    }
    
    get_notifications(){
        var db_notifications = this.db.getCollection("db_notifications");
        if (db_notifications == null) {              
            db_notifications = this.db.addCollection("db_notifications");                     
        }
        return db_notifications;
    }
    
      
    get_wallet_addresses(change,from_addr,to_addr){
        var db_wallet_addresses = this.db.getCollection("db_wallet_addresses");
        if (db_wallet_addresses == null) {   
            console.log("db_wallet_addresses is null!")
            db_wallet_addresses = this.db.addCollection("db_wallet_addresses", {unique: ["combined_key"]});
        }
        var config = this.get_config_values();
        var last=-999;
                             
        var read_from_db=db_wallet_addresses.chain().find({'$and': [{"type": {'$aeq': change}}, {"pos": {'$gte':from_addr}}, {"pos": {'$lt':to_addr}}]}).simplesort("pos").data({forceClones: true, removeMeta: true});
        if(read_from_db!=null && read_from_db.length!=undefined && read_from_db[read_from_db.length-1]!=undefined){
          last=read_from_db[read_from_db.length-1].pos;}
        
        if(last+1<to_addr){
            console.error("add to wallet addresses: "+(last+1)+" -> "+to_addr);
            last=((last+1)<0 || last==undefined) ? 0 : (last+1);
            var add_addresses=this.wallet_functions.get_derived_adresses(config.master_seed,change,last,to_addr);
            for (var i = 0,len=add_addresses.length; i < len; i++) {
                var input_addr=add_addresses[i]; 
                input_addr.combined_key=((last+i)+":"+change);
//                console.log("####################################################INSERT ADDR:"+((last+i)+":"+change)+" | "+input_addr.pos+","+input_addr.type);
                     db_wallet_addresses.insert(input_addr);
                }
            read_from_db=db_wallet_addresses.chain().find({'$and': [{"type": {'$aeq': change}}, {"pos": {'$gte':from_addr}}, {"pos": {'$lt':to_addr}}]}).simplesort("pos").data({forceClones: true, removeMeta: true});  
//            console.log("from to:"+from_addr+"->"+to_addr);
//            console.log(read_from_db);
            return read_from_db;
        }
        else{         
           return read_from_db; 
        }                         
    }
    
    update_self_sent_txs(tx,self_inputs,self_outputs){
        var db_self_sent_inputs = this.db.getCollection("db_self_sent_inputs");
        if (db_self_sent_inputs == null) {   
            console.log("db_self_sent_inputs is null!")
            db_self_sent_inputs = this.db.addCollection("db_self_sent_inputs", {unique: ["combined_key"]});                     
        }
        
        var db_self_sent_outputs = this.db.getCollection("db_self_sent_outputs");
        if (db_self_sent_outputs == null) {   
            console.log("db_self_sent_outputs is null!")
            db_self_sent_outputs = this.db.addCollection("db_self_sent_outputs", {unique: ["combined_key"]});                     
        }
               
        
        var cnf=this.get_config_values();
        var c_time= Math.floor((new Date()).getTime() / 1000);
        
        for(var i=0;i<self_inputs.length;i++){
            //inputs: tx,in_index,from_tx,from_vout,create_height,time,blockhash
            var self_input_obj={combined_key:(tx+":"+i),tx:tx,in_index:i,from_tx:self_inputs[i].prev_tx,from_vout:self_inputs[i].input_index,create_height:(cnf.sync_height+999999999),time:c_time,blockhash:null};
            if(db_self_sent_inputs.findOne({combined_key: {'$aeq': (tx+":"+i)}}) == null){
                db_self_sent_inputs.insert(self_input_obj);
            }
        }
        
        var nar_counter=0;
        for(var i=0;i<self_outputs.length;i++){
            //outputs:tx,num,value,scriptPubKey,to_address,create_height,time,mature,blockhash
            console.log("####SELF OUTPUTS",self_outputs[i]);                              
            var self_output_obj={combined_key:(tx+":"+(i+nar_counter)),tx:tx,num:(i+nar_counter),value:self_outputs[i].amount,scriptPubKey:null,to_address:self_outputs[i].destination_address,create_height:(cnf.sync_height+999999999),time:c_time,mature:1,blockhash:null};
            if(db_self_sent_outputs.findOne({combined_key: {'$aeq': (tx+":"+(i+nar_counter))}}) == null){
                db_self_sent_outputs.insert(self_output_obj);
            }
            
              //narration
            var narration=(self_outputs[i].narration !=undefined ? self_outputs[i].narration : null);          
            if(narration!=null){
                nar_counter++;  
                var nar_hex = ascii_string_to_hex(narration);              
                narration = "6a" + "026e70" + "6a" + int_toVarint_byte((nar_hex.length / 2), 1) + nar_hex;
                var self_output_obj={combined_key:(tx+":"+(i+nar_counter)),tx:tx,num:(i+nar_counter),value:0,scriptPubKey:narration,to_address:self_outputs[i].destination_address,create_height:(cnf.sync_height+999999999),time:c_time,mature:1,blockhash:null};
                if(db_self_sent_outputs.findOne({combined_key: {'$aeq': (tx+":"+(i+nar_counter))}}) == null){
                    db_self_sent_outputs.insert(self_output_obj);
                }
                            
            }
            
           
            
        }
                            
    }   
  /*  clean_self_sent_txs(inputs,outputs){
        var db_self_sent_inputs = this.db.getCollection("db_self_sent_inputs");
        if (db_self_sent_inputs == null) {   
            console.log("db_self_sent_inputs is null!")
            db_self_sent_inputs = this.db.addCollection("db_self_sent_inputs", {unique: ["combined_key"]});                     
        }
        
        var db_self_sent_outputs = this.db.getCollection("db_self_sent_outputs");
        if (db_self_sent_outputs == null) {   
            console.log("db_self_sent_outputs is null!")
            db_self_sent_outputs = this.db.addCollection("db_self_sent_outputs", {unique: ["combined_key"]});                     
        }
        
        for(var i=0;i<inputs.length;i++){
            if(db_self_sent_inputs.findOne({tx: {'$aeq': inputs[i].tx}}) != null){
                db_self_sent_inputs.findAndRemove({tx: {'$aeq': inputs[i].tx}});
            }
        }
        
        for(var i=0;i<outputs.length;i++){
            if(db_self_sent_outputs.findOne({tx: {'$aeq': outputs[i].tx}}) != null){
                db_self_sent_outputs.findAndRemove({tx: {'$aeq': outputs[i].tx}});
            }
        }
    }*/
    
    update_mempool_txs(mempool_outputs){
              
        var db_mempool_outputs = this.db.getCollection("db_mempool_outputs");
        if (db_mempool_outputs == null) {   
            console.log("db_mempool_outputs is null!")
            db_mempool_outputs = this.db.addCollection("db_mempool_outputs", {unique: ["combined_key"]});                     
        }
        
           
               
        
        var cnf=this.get_config_values();
        var c_time= Math.floor((new Date()).getTime() / 1000);
               
       
        
        for(var i=0;i<mempool_outputs.length;i++){
            //outputs:tx,num,value,scriptPubKey,to_address,create_height,time,mature,blockhash                                 
            console.log("####MEMPOOL OUTPUTS",mempool_outputs[i]);   
            
             var address=mempool_outputs[i].scriptPubKey.addresses;
             if(address!=undefined && address!=null){
                 address=address[0];
             }
                       
            var self_output_obj={combined_key:(mempool_outputs[i].tx+":"+mempool_outputs[i].num),tx:mempool_outputs[i].tx,num:mempool_outputs[i].num,value:mempool_outputs[i].value,scriptPubKey:mempool_outputs[i].scriptPubKey.hex,to_address:address,create_height:(cnf.sync_height+999999999),time:c_time,mature:1,blockhash:null};
            if(db_mempool_outputs.findOne({combined_key: {'$aeq': (mempool_outputs[i].tx+":"+mempool_outputs[i].num)}}) == null){
                db_mempool_outputs.insert(self_output_obj);
            }         
        }
                            
    }
    
    //aliwa server address collection
    get_aliwa_server_addresses(){
        var db_aliwa_server_addresses = this.db.getCollection("db_aliwa_server_addresses");
        if (db_aliwa_server_addresses == null) {   
            console.log("db_aliwa_server_addresses is null!")
            db_aliwa_server_addresses = this.db.addCollection("db_aliwa_server_addresses", {unique: ["label"]});                     
        }
        
        return db_aliwa_server_addresses;
    }
    
               
}
