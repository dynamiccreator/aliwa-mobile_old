module.exports = function () {
   const aliwa= require("./logic/wallet");      
   const {ipcMain, Notification,dialog} =require ("electron");
//   const path = require('path');
   
   var wallet=null;
   var syncing_loop_timeout=null;
   
  
         
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
   
          
   ipcMain.handle('open_wallet', async (event) => {
    var wal = new aliwa.aliwa_wallet();
    var data = wal.read_wallet_DB();
    if (data == false) {return false;}
    else{ return true;}
   });
   
   ipcMain.handle('create_wallet', async (event, seed_words,seed_pw,wallet_pw,has_backup) => {
    if(wallet!=null){
        wallet.disconnect();
        delete wallet;
        wallet=null;
    }   
    var wal = new aliwa.aliwa_wallet();
    await wal.create_wallet(seed_words,seed_pw,wallet_pw,has_backup);
    //inital update for address gen
    await wal.db_wallet.update_addressbook_receive(-1);   
    await wal.save_wallet(null,true,true);  
    var data = wal.read_wallet_DB();
    if (data == false) {return false;}
    else{ return true;}
   });
   
   //SEED*****************************************************************
   ipcMain.handle('get_wallet_seed', async (event) => {
       var seed=wallet.get_wallet_seed();
       return seed;
   });
   
   ipcMain.handle('get_new_seed', async (event) => {
       var wal = new aliwa.aliwa_wallet();
       var seed={seed_words:wal.wallet_functions.get_new_seed_words(),seed_pw:null};
       return seed;
   });
   
   //SETTINGS*************************************************************
   
    ipcMain.handle('set_password', async (event,pw) => {
        return await wallet.set_wallet_pw(pw);       
   });
   
   ipcMain.handle('compare_password', async (event,pw) => {
        return await wallet.compare_pw(pw);       
   });
   
   ipcMain.handle('has_backup', async (event) => {
       if(wallet!=null){
        return await wallet.has_backup(); 
        }
        else{return false;}
   });
   
   ipcMain.handle('set_backup', async (event) => {
        return await wallet.set_backup();       
   });
   
   //OVERVIEW*************************************************************  
   ipcMain.handle('load_wallet', async (event,pw) => {
    if(wallet!=null){
        wallet.disconnect();
        delete wallet;
        wallet=null;
    }
    wallet = new aliwa.aliwa_wallet();
    var data = wallet.read_wallet_DB();
    var can_load_db = await wallet.load_wallet_DB(data, pw);   
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
     
   ipcMain.handle('get_sync_state', async (event) => {
        return wallet.sync_state;
   });
   
  ipcMain.handle('gui_was_updated', async (event) => {      
    return wallet.gui_was_updated;
   });
   
   ipcMain.handle('set_gui_updated', async (event) => {      
     wallet.gui_was_updated=true;
   }); 
   
   ipcMain.handle('get_balance', async (event) => {     
        var balance=await wallet.get_balance();
        return balance;   
   });
   
   //RECEIVE*****************************************************************
       ipcMain.handle('get_latest_receive_addr', async (event) => {             
        return wallet.get_highest_unused_receive_address();
   });
   
    ipcMain.handle('add_new_receive_addr', async (event,label) => {             
        return wallet.new_receive_address(label);
   });
   
     ipcMain.handle('change_receive_address_label', async (event,pos,label) => {             
        return wallet.change_receive_address_label(pos,label);
   });
   
    ipcMain.handle('save_wallet', async (event,path) => {             
        return wallet.save_wallet(path);
   });
   
   
   //SENDING***************************************************************** 
    ipcMain.handle('send', async (event,tx_info) => {             
        console.log("before_sending: ",tx_info);
        wallet.send_transaction(tx_info.hex,tx_info.tx_object);
   });
   
   ipcMain.handle('get_fee', async (event,destinations) => {
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
   
   ipcMain.handle('get_raw_tx', async (event,destinations) => {
        var tx_build= await wallet.create_transaction(destinations);
        if(tx_build!=false){
        return tx_build;}
        else{return false;}
   });
   
   //ADDRESSBOOK*************************************************************
   
   
   ipcMain.handle('list_receive_addresses', async (event,page, order_field, direction, search) => {
        var list_result= wallet.list_receive_addresses(page, order_field, direction, search);
        return list_result;
   });
   
   ipcMain.handle('list_contact_addresses', async (event,page, order_field, direction, search) => {
        var list_result= wallet.list_contact_addresses(page, order_field, direction, search);
        return list_result;
   });
   
   ipcMain.handle('add_new_contact_address', async (event,label,address) => {
        var list_result= wallet.new_contact_address(label,address);
        return list_result;
   });
   
    ipcMain.handle('change_contact_address', async (event,pos,label) => {
        var list_result= wallet.change_contact_address_label(pos,label);
        return list_result;
   });
   
   ipcMain.handle('change_contact_address_by_address', async (event,address,label) => {
        var list_result= wallet.change_contact_address_label_find_by_address(address,label);
        return list_result;
   });
   
     ipcMain.handle('delete_contact_address', async (event,pos) => {
        var list_result= wallet.delete_contact_address(pos);
        return list_result;
   });
   
   
   
   
  
  //TRANSACTIONS VIEW********************************************************
  
    ipcMain.handle('list_transactions', async (event,page, order_field, direction, search) => {
        var list_result= wallet.list_transactions(page, order_field, direction, search);
        return list_result;
   });
   
    ipcMain.handle('get_single_transaction', async (event,tx) => {
        var list_result= wallet.get_single_transaction(tx);
        return list_result;
   });
   
   //open in browser
   ipcMain.handle('open_tx_link', async (event,link) => {
        require("electron").shell.openExternal(link);
   });
   
   //label list
   ipcMain.handle('get_address_labels', async (event,address_list) => {
        var list_result= wallet.get_labels(address_list);
        return list_result;
   });
   
   ipcMain.handle('set_address_label_contact_or_receive', async (event,address,label) => {
        return wallet.set_label_contact_or_receive(address,label);       
   });
   
   //NOTIFICATIONS************************************************
   ipcMain.handle('get_notifications', async (event) => {
        return wallet.get_and_remove_notifications();       
   });
   
   
   ipcMain.handle('is_notifications_enabled', async (event) => {
        return wallet.is_notifications_enabled();       
   });
   
   ipcMain.handle('set_notifications_enabled', async (event,value) => {
        return wallet.set_notifications_enabled(value);       
   });
   
   
    //CURRENCIES************************************************
   ipcMain.handle('get_alias_prices', async (event) => {
        return wallet.get_alias_prices();       
   });
   
   ipcMain.handle('set_selected_currency', async (event,currency) => {
        return wallet.set_selected_currency(currency);       
   });
   
   ipcMain.handle('get_selected_currency', async (event) => {
        return wallet.get_selected_currency();       
   });
   
   //CUSTOM SERVER ADDRESSES************************************
   ipcMain.handle('list_server_aliwa_addresses', async (event) => {
        return wallet.list_server_aliwa_addresses();       
   });
   
   
   ipcMain.handle('add_aliwa_server_address', async (event,label,address,type) => {
        return wallet.add_aliwa_server_address(label,address,type);       
   });
   
   
   ipcMain.handle('edit_aliwa_server_address', async (event,label,address) => {
        return wallet.edit_aliwa_server_address(label,address);       
   });
   
   ipcMain.handle('delete_aliwa_server_address', async (event,label) => {
        return wallet.delete_aliwa_server_address(label);       
   });
   
   ipcMain.handle('switch_to_aliwa_server_address', async (event,label,complete_resync) => {
        return wallet.switch_to_aliwa_server_address(label,complete_resync);       
   });
   
   //save and import dialogue
   ipcMain.handle('save_as_dialogue', async (event) => {
       var filename = await dialog.showSaveDialog({title:"Save Backup File",defaultPath:"light_wallet.dat",buttonLabel:"Save Backup File"});
       console.log(filename);
       if(!filename.canceled){
           wallet.save_wallet(filename.filePath,true);
           return true;
       }
       return false;
   });
   
   ipcMain.handle('import_file_dialogue', async (event) => {
       var filename = await dialog.showOpenDialog({title:"Import Backup File",buttonLabel:"Import Backup File"});
       console.log(filename);
       if(!filename.canceled){
           var wal = new aliwa.aliwa_wallet();
           var data = wal.read_wallet_DB(filename.filePaths[0]);
           if (data == false) {console.log("nothing to read");return false;}
           else{ 
                try {
                    fs.writeFileSync(wal.db_wallet.default_path, data);
                    console.log("FILE WRITTEN")
                } catch (err) {
                    console.error(err);
                    return false;
                }
                return true;
            
            }                                             
       }
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
             
};
