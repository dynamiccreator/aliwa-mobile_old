 //   const {ipcMain, Notification,dialog} =require ("electron");
//   const path = require('path');
   
   var wallet=null;
   var syncing_loop_timeout=null;
   
  
         
document.addEventListener("deviceready", onDeviceReady, false);
function onDeviceReady() {
    console.log(cordova.file);
}

   
  
         
   //STARTUP************************************************************
    function syncing_loop(time){
        syncing_loop_timeout = setTimeout(async function(){
            if(wallet!=null && wallet!=undefined){               
                await wallet.sync();        
            }
            
            if(wallet!=null && wallet!=undefined && wallet.sync_shift>0){
                syncing_loop(time+wallet.sync_shift);
                wallet.sync_shift=0;
            }
            else{syncing_loop(time);}           
        },time);     
   }
   
          
   my_handle('open_wallet', async (event) => {
    var wal = new aliwa_wallet();
    var data = await wal.read_wallet_DB();
    if (data == false) {return false;}
    else{ return true;}
   });
   
   my_handle('create_wallet', async (event, seed_words,seed_pw,wallet_pw,has_backup) => {
    if(wallet!=null){
        wallet.disconnect();
        delete wallet;
        wallet=null;
    }   
    var wal = new aliwa_wallet();
    await wal.create_wallet(seed_words,seed_pw,wallet_pw,has_backup);
    //inital update for address gen
    await wal.db_wallet.update_addressbook_receive(-1);   
    await wal.save_wallet(null,true,true);  
    var data = await wal.read_wallet_DB();
    if (data == false) {return false;}
    else{ return true;}
   });
   
   //SEED*****************************************************************
   my_handle('get_wallet_seed', async (event) => {
       var seed=wallet.get_wallet_seed();
       return seed;
   });
   
   my_handle('get_new_seed', async (event) => {
       var wal = new aliwa_wallet();
       var seed={seed_words:wal.wallet_functions.get_new_seed_words(),seed_pw:null};
       return seed;
   });
   
   //SETTINGS*************************************************************
   
    my_handle('set_password', async (event,pw) => {
        return await wallet.set_wallet_pw(pw);       
   });
   
   my_handle('compare_password', async (event,pw) => {
        return await wallet.compare_pw(pw);       
   });
   
   my_handle('has_backup', async (event) => {
       if(wallet!=null){
        return await wallet.has_backup(); 
        }
        else{return false;}
   });
   
   my_handle('set_backup', async (event) => {
        return await wallet.set_backup();       
   });
   
   //OVERVIEW*************************************************************  
   my_handle('load_wallet', async (event,pw) => {
    if(wallet!=null){
        wallet.disconnect();
        delete wallet;
        wallet=null;
    }
    wallet = new aliwa_wallet();
    var data = await wallet.read_wallet_DB();
    var can_load_db = await wallet.load_wallet_DB(data, pw); 
    console.log("can_load_db ?: ",can_load_db)
    if (can_load_db === true) {
        await wallet.connect_to_server();
        if(syncing_loop_timeout!=null){
                clearTimeout(syncing_loop_timeout);
                syncing_loop_timeout=null;
        }
        syncing_loop(30000);
    return true;}
    else{ return false;}
   });
     
   my_handle('get_sync_state', async (event) => {
        return wallet.sync_state;
   });
   
  my_handle('gui_was_updated', async (event) => {      
    return wallet.gui_was_updated;
   });
   
   my_handle('set_gui_updated', async (event) => {      
     wallet.gui_was_updated=true;
   }); 
   
   my_handle('get_balance', async (event) => {     
        var balance=await wallet.get_balance();
        return balance;   
   });
   
    my_handle('get_server_info', async (event) => {     
        var info=await wallet.get_server_info();
        return info;   
   });
   
   //RECEIVE*****************************************************************
       my_handle('get_latest_receive_addr', async (event) => {             
        return wallet.get_highest_unused_receive_address();
   });
   
    my_handle('add_new_receive_addr', async (event,label) => {             
        return wallet.new_receive_address(label);
   });
   
     my_handle('change_receive_address_label', async (event,pos,label) => {             
        return wallet.change_receive_address_label(pos,label);
   });
   
    my_handle('save_wallet', async (event,path) => {             
        return wallet.save_wallet(path);
   });
   
   
   //SENDING***************************************************************** 
    my_handle('send', async (event,tx_info) => {             
      //  console.log("before_sending: ",JSON.stringify(tx_info));
       //CLEAN Private and Public KEYS!!!!
       var cleaned_tx_info={};
       cleaned_tx_info.inputs=[];
       for(var i=0;i<tx_info.tx_object.inputs.length;i++){
           var input={};
           input.prev_tx=tx_info.tx_object.inputs[i].prev_tx;
           input.input_index=tx_info.tx_object.inputs[i].input_index;
           input.script_pubkey=tx_info.tx_object.inputs[i].script_pubkey;        
           cleaned_tx_info.inputs.push(input);
       }
       cleaned_tx_info.outputs=JSON.parse(JSON.stringify(tx_info.tx_object.outputs));
//       for(var i=0;i<tx_info.tx_object.outputs.length;i++){
//           var outputs={};             
//           cleaned_tx_info.outputs.push(JSON.parse(JSON.stringify(outputs[i])));
//       }
       console.log(JSON.stringify(cleaned_tx_info));
        wallet.send_transaction(tx_info.hex,cleaned_tx_info);
   });
   
   my_handle('get_fee', async (event,destinations) => {
        var tx_build= await wallet.create_transaction(destinations,undefined,undefined,true);
        if(tx_build!=false){
        if(tx_build.exceed!=undefined){
            console.log("exceed returned with: "+tx_build.exceed);
            return tx_build;
        }        
        return tx_build.fee;
        }
        else{return false;}
   });
   
   my_handle('get_raw_tx', async (event,destinations) => {
        var tx_build= await wallet.create_transaction(destinations);
        if(tx_build!=false){
        return tx_build;}
        else{return false;}
   });
   
   //ADDRESSBOOK*************************************************************
   
   
   my_handle('list_receive_addresses', async (event,page, order_field, direction, search) => {
        var list_result= wallet.list_receive_addresses(page, order_field, direction, search);
        return list_result;
   });
   
   my_handle('list_contact_addresses', async (event,page, order_field, direction, search) => {
        var list_result= wallet.list_contact_addresses(page, order_field, direction, search);
        return list_result;
   });
   
   my_handle('add_new_contact_address', async (event,label,address) => {
        var list_result= wallet.new_contact_address(label,address);
        return list_result;
   });
   
    my_handle('change_contact_address', async (event,pos,label) => {
        var list_result= wallet.change_contact_address_label(pos,label);
        return list_result;
   });
   
   my_handle('change_contact_address_by_address', async (event,address,label) => {
        var list_result= wallet.change_contact_address_label_find_by_address(address,label);
        return list_result;
   });
   
     my_handle('delete_contact_address', async (event,pos) => {
        var list_result= wallet.delete_contact_address(pos);
        return list_result;
   });
   
   
   
   
  
  //TRANSACTIONS VIEW********************************************************
  
    my_handle('list_transactions', async (event,page, order_field, direction, search) => {
        var list_result= wallet.list_transactions(page, order_field, direction, search);
        return list_result;
   });
   
    my_handle('get_single_transaction', async (event,tx) => {
        var list_result= wallet.get_single_transaction(tx);
        return list_result;
   });
   
   //open in browser
   my_handle('open_tx_link', async (event,link) => {
        require("electron").shell.openExternal(link);
   });
   
   //label list
   my_handle('get_address_labels', async (event,address_list) => {
        var list_result= wallet.get_labels(address_list);
        return list_result;
   });
   
   my_handle('set_address_label_contact_or_receive', async (event,address,label) => {
        return wallet.set_label_contact_or_receive(address,label);       
   });
   
   //NOTIFICATIONS************************************************
   my_handle('get_notifications', async (event) => {
        return wallet.get_and_remove_notifications();       
   });
   
   
   my_handle('is_notifications_enabled', async (event) => {
        return wallet.is_notifications_enabled();       
   });
   
   my_handle('set_notifications_enabled', async (event,value) => {
        return wallet.set_notifications_enabled(value);       
   });
   
   
    //CURRENCIES************************************************
   my_handle('get_alias_prices', async (event) => {
        return wallet.get_alias_prices();       
   });
   
   my_handle('set_selected_currency', async (event,currency) => {
        return wallet.set_selected_currency(currency);       
   });
   
   my_handle('get_selected_currency', async (event) => {
        return wallet.get_selected_currency();       
   });
   
   //CUSTOM SERVER ADDRESSES************************************
   my_handle('list_server_aliwa_addresses', async (event) => {
        return wallet.list_server_aliwa_addresses();       
   });
   
   
   my_handle('add_aliwa_server_address', async (event,label,address,type) => {
        return wallet.add_aliwa_server_address(label,address,type);       
   });
   
   
   my_handle('edit_aliwa_server_address', async (event,label,address) => {
        return wallet.edit_aliwa_server_address(label,address);       
   });
   
   my_handle('delete_aliwa_server_address', async (event,label) => {
        return wallet.delete_aliwa_server_address(label);       
   });
   
   my_handle('switch_to_aliwa_server_address', async (event,label,complete_resync) => {
        return wallet.switch_to_aliwa_server_address(label,complete_resync);       
   });
   
   //save and import dialogue
   my_handle('save_as_dialogue', async (event) => {
     /*  var filename = await dialog.showSaveDialog({title:"Save Backup File",defaultPath:"light_wallet.dat",buttonLabel:"Save Backup File"});
       console.log(filename);
       if(!filename.canceled){
           wallet.save_wallet(filename.filePath,true);
           return true;
       }*/
      /*window.plugins.mfilechooser.open([''], function (uri) {
      
      alert(uri);
      
    }, function (error) {
      
        alert(error);
    
    });*/
        
        var localURLs    = [
//    cordova.file.dataDirectory,
//    cordova.file.documentsDirectory,
//    cordova.file.externalApplicationStorageDirectory,
//    cordova.file.externalCacheDirectory,
//    cordova.file.externalRootDirectory,
//    cordova.file.externalDataDirectory,
//    cordova.file.sharedDirectory,
//    cordova.file.syncedDataDirectory
];
var index = 0;
var i;
var statusStr = "";
var addFileEntry = function (entry) {
    alert(JSON.stringify(entry.name));
    if(entry.name=="Documents"){
       alert(JSON.stringify(entry)); 
       window.resolveLocalFileSystemURL(localURLs[i], function(sub){
           alert("SUB: "+JSON.stringify(sub)); 
       }, addError);
       }
    var dirReader = entry.createReader();
    dirReader.readEntries(
        function (entries) {
            var fileStr = "";
            var i;
            for (i = 0; i < entries.length; i++) {
                if (entries[i].isDirectory === true) {
                    // Recursive -- call back into this subdirectory
                    addFileEntry(entries[i]);
                } else {
                   fileStr += (entries[i].fullPath + "<br>"); // << replace with something useful
                   index++;
                }
            }
            // add this directory's contents to the status
            statusStr += fileStr;
            // display the file list in #results
            if (statusStr.length > 0) {
                $("#results").html(statusStr);              
            } 
        },
        function (error) {
            console.log("readEntries error: " + error.code);
            statusStr += "<p>readEntries error: " + error.code + "</p>";
        }
    );
};
var addError = function (error) {
    console.log("getDirectory error: " + error.code);
    statusStr += "<p>getDirectory error: " + error.code + ", " + error.message + "</p>";
};
for (i = 0; i < localURLs.length; i++) {
    if (localURLs[i] === null || localURLs[i].length === 0) {
        continue; // skip blank / non-existent paths for this platform
    }
    window.resolveLocalFileSystemURL(localURLs[i], addFileEntry, addError);
}


        
        
       return false;
   });
   my_handle('import_file_dialogue', async (event) => {
        
       const file = await chooser.getFile();
       
       console.log(file ? file.name : 'canceled');
       console.log(file ? file : 'canceled');
       
       /*var filename = await dialog.showOpenDialog({title:"Import Backup File",buttonLabel:"Import Backup File"});
       console.log(filename);
       if(!filename.canceled){
           var wal = new aliwa_wallet();
           var data = await wal.read_wallet_DB(filename.filePaths[0]);
           if (data == false) {console.log("nothing to read");return false;}
           else{ 
                try {
//                    fs.writeFileSync(wal.db_wallet.default_path, data);
                    console.log("FILE WRITTEN")
                } catch (err) {
                    console.error(err);
                    return false;
                }
                return true;
            
            }                                             
       }*/
       return false;
   });
   
   //save on exit test
//   ipcMain.handle('wallet_save_on_exit', async (event) => {
//         console.log("save_on_exit");       
//   });

    save_on_exit= async function (){
        if(wallet!=null){
            await wallet.save_wallet(null,true);
        }
    }
    
 
document.addEventListener("pause", async () => {   
      await save_on_exit();
}, false);    

 temp_wallet_saver="file not found";
 sync_sleep = (delay) => new Promise((resolve) => setTimeout(resolve, delay))

function writeFile(fileEntry, dataObj) {
    // Create a FileWriter object for our FileEntry (log.txt).
    fileEntry.createWriter(function (fileWriter) {

        fileWriter.onwriteend = function() {
            console.log("Successful file write...");    
        };

        fileWriter.onerror = function (e) {
            console.log("Failed file write: " + e.toString());
        };

        // If data object is not passed in,
        // create a new Blob instead.
        if (!dataObj) {
            dataObj = new Blob(['some file data'], { type: 'text/plain' });
        }

        fileWriter.write(dataObj);
    });
}

function readFile(fileEntry) {

    fileEntry.file(function (file) {
        var reader = new FileReader();       
       reader.onloadend = function() {
            console.log("Successful file read: ");// + this.result);
//            displayFileData(fileEntry.fullPath + ": " + this.result);
            temp_wallet_saver=this.result;           
        };
        reader.readAsText(file);  
       
    }, function(){console.error("onErrorReadFile");temp_wallet_saver="---read error---";});
}
