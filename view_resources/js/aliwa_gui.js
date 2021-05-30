var view_builder={
    start_up:["start_up"],
    main_menu:["navbar","main_tab","message","overview"],
    transactions:["navbar","main_tab","transactions"],
    transaction_details:["single_transaction"],
    settings:["sub_navbar","settings"],
//        backup_info:["sub_navbar","backup_info"],
//        backup_action:["sub_navbar","backup_action"],
//        
    backup:["sub_navbar","backup"],    
    view_backup_phrase:["sub_navbar","view_backup_phrase"],
//        
        set_password:["sub_navbar","set_password"],
//        
        native_currency:["sub_navbar","native_currency"],
//        language:["sub_navbar","language"],
        custom_server:["sub_navbar","custom_server"],
        about:["sub_navbar","about"],
    send:["sub_navbar","send"],
    receive:["sub_navbar","receive"],
    receive_payment:["sub_navbar","receive_payment"],
    address_book_contacts:["sub_navbar","main_tab","address_book_contacts"],
    address_book_receiving:["sub_navbar","main_tab","address_book_receiving"],
//    scan:["sub_navbar","scan"]
    dialogues:["dialogues"]
};

var sync_interval=null;
var global_balance=null;


var templ_loads={};

$(function () {
$(document).on("templ_ready", gui);
load_all_templates_to_mem(0,0);
    
});

var alias_prices=null;
var selected_currency=null;
var notifications_enabled=false;

//fill variables

//backup
var fill_backup_seed_words=[];
var fill_backup_seed_pw=null;

//fill send
var fill_send_address=null;
var fill_send_label=null;
var fill_send_note=null;
var fill_send_amount=null;

var last_dest_val_change="";
var transaction_send_list=[];
var transaction_current_send_number=0;
var transaction_amount_sum=0;


//view transaction table settings
var transaction_table_sorting={page:0,field:"time",descending:true,search:null};
var transactions_last_search_time=0;


//view payment
var payment_last_update_time=0;

//addressbook
var addressbook_receiving_sorting={page:0,field:"pos",descending:true,search:null};
var addressbook_receiving_last_search_time=0;

var addressbook_contacts_sorting={page:0,field:"pos",descending:true,search:null};
var addressbook_contacts_last_search_time=0;





 async function gui() {    
   //start_up    
    view_start_up();

    }


function build_from_key(key){
    var data="";
    for(var i=0;i<view_builder[key].length;i++){
        console.log("put:" +view_builder[key][i]);
        data+=templ_loads[view_builder[key][i]];
    }
    return data;
}

function load_all_templates_to_mem(next,sub_next){
   var keys=Object.keys(view_builder);
   var key=keys[next];

   if(next<keys.length){
       if(sub_next<view_builder[key].length)
       {
           if(templ_loads[view_builder[key][sub_next]]==undefined){             
            $.get("view_resources/html/templ_" + view_builder[key][sub_next] + ".html", function (data) {                
                templ_loads[view_builder[key][sub_next]]=data;
                load_all_templates_to_mem(next,(sub_next+1));
            });
            }else{load_all_templates_to_mem(next,(sub_next+1));}
        }
        else{
            load_all_templates_to_mem((next+1),0);
        }
    }
    else{
        $.event.trigger({type:"templ_ready"});
        console.log("trigger");
    }
    
}

//show views

function view_start_up(){
    window.scrollTo(0, 0);
    $("body").html(build_from_key("start_up")).hide();
    $("body").fadeIn(1000,"easeInOutQuad");
    input_clear_button_func("#view_startup_input_password","#view_startup_input_password_label_clear");
    
    $("#view_startup_input_password_eye").off("click").on("click",function(){
         if($(this).hasClass("slash")){
            $(this).removeClass("slash");
            $(this).parent().find("input").prop("type","text");
         }
         else{
             $(this).addClass("slash");
             $(this).parent().find("input").prop("type","password");
         }      
         $(this).parent().find("input").focus();        
     });
    
    //
    setTimeout(async function(){
        var result= await window.electron.ipcRenderer_invoke("open_wallet");
        if(result){
            var not_encrypted= await window.electron.ipcRenderer_invoke("load_wallet",null);
            if(not_encrypted){
                $('#view_start_up_when_wallet_exists').slideDown(800,"easeInOutQuad");
                $('#view_start_up_button_open_wallet').off("click").on("click",async function(){
                    //await window.electron.ipcRenderer_invoke("load_wallet",null);
                    view_overview();
                });
            }
            else{
                $('#view_start_up_when_wallet_encrypted').slideDown(800,"easeInOutQuad");
                $('#view_start_up_when_wallet_exists').slideDown(800,"easeInOutQuad");
                $('#view_start_up_button_open_wallet').off("click").on("click",async function(){
                    var password=$("#view_startup_input_password").val();
                    var try_password=await window.electron.ipcRenderer_invoke("load_wallet",password);
                    if(try_password){view_overview();}
                    else{
                        $('#view_start_up_button_open_wallet').transition('shake');
                        show_popup_action(templ_loads,"error","Wrong Password");
                    }
                });
                
            }
        }
         else{
            $('#view_start_up_when_wallet_not_found').slideDown(800,"easeInOutQuad");
         }
         
                
    },500);
    
    
    //if wallet exists
    $("#view_start_up_create_new_wallet_when_wallet_exists").off("click").on("click",async function(){
//         view_create_wallet();  
                 show_dialogue_modal(templ_loads,"Create New Wallet","This will delete your existing wallet and replace it with a new wallet.","Proceed","Abort",null
        ,async function(){
                    view_create_wallet();
                
        },async function(){});
         
         
//        show_dialogue_modal(templ_loads,"Create New Wallet","This will delete your existing wallet and replace it with a new wallet.","Proceed","Abort",null
//        ,async function(){
//                setTimeout(function(){
//                    show_dialogue_modal(templ_loads,"Create New Wallet - Info",
//                '<span style="color:#f00"><b>If you have no backup your coins will be lost forever!</b></span><br><br>Only a light_wallet.dat backup file contains your settings, contacts and labels.<br> With a seed you can only get back your\n\
//                coins without settings, contacts and labels.'
//                ,"I understand","Abort",null
//                ,async function(){ 
//                    setTimeout(function(){
//                        show_dialogue_modal(templ_loads,"Create New Wallet - CONFIRM DELETE",
//                        '<span style="color:#f00"><b>Delete current wallet</b></span> and create new wallet.'
//                        ,"CREATE NEW WALLET","Abort",null
//                        ,async function(){ 
//                            view_create_wallet();    
//                        },async function(){});
//                    },300);
//                    
//                },async function(){});
//                },300);
//                
//        },async function(){});
    });
    $("#view_start_up_import_wallet_when_wallet_exists").off("click").on("click",async function(){
         show_dialogue_modal(templ_loads,"Import Wallet","This will delete your existing wallet and replace it with your imported wallet.","Proceed","Abort",null
        ,async function(){                               
                $('.ui.modal').modal("hide");
                setTimeout(function(){ view_import_from_seed();   },300);
        },async function(){});                       
    });
    
    
    $("#view_start_up_button_create_new_wallet").off("click").on("click",async function(){view_create_wallet();});
    $("#view_start_up_button_import_wallet").off("click").on("click",async function(){view_import_from_seed();});
    
}

function view_create_wallet(){
    //quick testing
    setTimeout(async function(){
//        var seed_words= await window.electron.ipcRenderer_invoke('get_new_seed');
//        show_dialogue_info(templ_loads,"SEED WORDS",("This are your seed words:<br><br>"+seed_words),"OK",function(){
//            show_dialogue_input(templ_loads,"Enter a Seed Password (optional)","Enter a seed password to increase security or leave it empty for no seed password.","Seed Password","password","Proceed","Abort","data",async function(){ 
//                        var seed_pw=$("#dialogues_input_input").val();
//                        if(seed_pw==""){
//                            seed_pw=null;
//                        }
//                        await window.electron.ipcRenderer_invoke('create_wallet',seed_words,seed_pw,null);
//                        await window.electron.ipcRenderer_invoke("load_wallet",null);  
//                        $('.ui.modal').modal("hide");
//                        setTimeout(function(){ view_overview();},300);
//                                                                                   
//                 },async function(){});
//        });
        view_backup(true);
        
    },500);
    
}


function view_import_from_seed() {
     show_dialogue_modal(templ_loads,"Import Wallet Method","You can enter your Backup Phrase or import from file.","Import from File","Enter Backup Prase",null
        ,async function(){                                             
                setTimeout(async function(){
                    var import_path=await window.electron.ipcRenderer_invoke('import_file_dialogue');
                    console.log("import_path:",import_path);
                    if(!import_path.canceled){                       
                        setTimeout(function(){
                            $('.ui.modal').modal("hide");
                            view_start_up();
                            setTimeout(function(){ show_popup_action(templ_loads,"info","Wallet imported");},500);
                            },1500);
                    }
                },300);
        },async function(){ //enter backup phrase
            $('.ui.modal').modal("hide");
                setTimeout(function(){
                show_dialogue_input(templ_loads, "Enter your seed.", "Enter your seed words", "Seed Words", "text", "Proceed", "Abort", "data", async function () {
        
        var seed_words = $("#dialogues_input_input").val();
        if (seed_words == "") {
            seed_words = null;
        }
        $('.ui.modal').modal("hide");
        setTimeout(function () {
                    show_dialogue_input(templ_loads, "Enter your seed password.", "Enter your seed password", "Seed password", "text", "Proceed", "Abort", "data", async function () {

                        var seed_pw = $("#dialogues_input_input").val();
                        if (seed_pw == "") {
                            seed_pw = null;
                        }

                        await window.electron.ipcRenderer_invoke('create_wallet', seed_words, seed_pw, null, true);
                        await window.electron.ipcRenderer_invoke("load_wallet", null);
                        $('.ui.modal').modal("hide");
                        setTimeout(function () {
                            view_overview();
                        }, 300);


                    }, async function () {});

                }, 300);

            }, async function () {});    
                },300);
        });                       
   
    
    
    
       
    

}

async function view_overview(){
    //delayed startup variables
    selected_currency= await window.electron.ipcRenderer_invoke("get_selected_currency");
    notifications_enabled= await window.electron.ipcRenderer_invoke("is_notifications_enabled");
    
   window.scrollTo(0, 0);
   $("body").html(build_from_key("main_menu")).hide();
   $('.menu .item').tab();
   $("body").fadeIn(100,"easeInOutQuad");
   $("#tab_first").html('<i class="wallet icon"></i>&nbsp;Overview');
   $("#tab_second").html('<i class="exchange alternate icon"></i>&nbsp;Transactions');
    actions_overview();
    
    
    //for testing:
  //  tab_to_transactions();
}

function actions_overview(){
   $("#tab_second").removeClass("active");
   $("#tab_first").removeClass("active");
   $("#tab_first").addClass("active");
   
   $('#tab_second').off("click").on("click",function(){
        tab_to_transactions();           
     });
     
     $("#view_receive").off("click").on("click",function(){
        view_receive();              
     });
     
     $("#view_send").off("click").on("click",function(){
         view_send();  
//          if(global_balance==null){
//            $("#view_send").transition('shake');
//            show_popup_action(templ_loads,"error","Not synced!",250);
//            }
//            else{
//            view_send();  
//            }                     
     });
     
      $("#view_address_book").off("click").on("click",function(){
        view_address_book_contacts();              
     }); 
     
     $("#view_settings").off("click").on("click",function(){
        view_settings();              
     });
     
     //show balance
     set_balance();
     
     start_sync_interval();
}

async function set_balance() {

    //show balance
    if (global_balance != null) {
        var total_split = global_balance.total.split(".");

        //update overview
        $("#balance_alias").text(total_split[0] + ".");
        $("#balance_alias_digits").text(total_split[1]);
        $("#view_overview_field_balance_available").text(global_balance.available);
        $("#view_overview_field_balance_unconfirmed").text(global_balance.unconfirmed);
        
        //currency
        var selected=selected_currency;
        if(selected!=undefined && selected!=null)
        {selected=selected.toLowerCase()}
        else{selected="usd"}
        var calc_total=numeral(global_balance.total).multiply(alias_prices[selected]).value();
        var format_l=Math.ceil((Math.log(calc_total)/Math.log(9.99999)*-1))+2;
        format_l=format_l<2 ? 2 : format_l;
        var f_string="";
        for(var i=0;i<format_l;i++){
         f_string+="0";   
        }
        console.log(calc_total+" | "+f_string)
//        var formatted_currency_value=numeral(global_balance.total).multiply(alias_prices[selected]).value();
        
        $("#balance_currency").text(numeral(global_balance.total).multiply(alias_prices[selected]).format("0."+f_string));
        $("#currency").text(selected.toUpperCase());

        //update send
        $("#view_send_available_balance").text(numeral(global_balance.available).subtract(transaction_amount_sum).format("0.00000000"));
        $("#send_currency_label").text(selected.toUpperCase());
    }
}
async function start_sync_interval(){   
    if(sync_interval==null){
      sync_interval=setInterval(async function(){
            load_balance();     
            }, 250);
    }
}

async function load_balance(){
    var sync_state = await window.electron.ipcRenderer_invoke("get_sync_state");
            if (sync_state == "synced") {
                var was_updated= await window.electron.ipcRenderer_invoke("gui_was_updated");
                if(!was_updated){                  
                    await window.electron.ipcRenderer_invoke("set_gui_updated");
                    //update overview and Send
                    var balance = await window.electron.ipcRenderer_invoke("get_balance");    
                    global_balance = balance;
                    alias_prices= await window.electron.ipcRenderer_invoke("get_alias_prices");                 
                    set_balance();
                    
                                                         
                    //update transactions
                   if($("#view_transactions_table_body").html()!=null){
                       // console.log($("#view_transactions_table_body"))

                    var cur_num=parseInt($("#view_transactions_pagination_container_page_third").text());
                    transaction_table_sorting.page=cur_num-1;
                    var j_clone=await transactions_pagination();
                    $('#view_transactions_table_body').html(j_clone.find("#view_transactions_table_body").html());
                    transactions_pagination_actions();
                    }
                                        
                    //IF new transactions:
                    //show notifications on new txs
                    //update tx and etc. 
                    if(notifications_enabled){
                        var notifications= await window.electron.ipcRenderer_invoke("get_notifications");
                        for(var i=0;i<notifications.length;i++){
                            new Notification(notifications[i].title, {
                                icon: 'view_resources/img/aliwa_light.png',
                                body: notifications[i].body
                            });
                        }
                    }
                }
                
                $("#aliwa_main_update_button").css("margin-top","0.0rem").html('<i class="ui icon check circle large" style="color:#594663;"></i>');

                
            } else {
                
                if(!$("#aliwa_main_update_button").find("div").hasClass("loader")){
                $("#aliwa_main_update_button").css("margin-top","0.0rem").html('<div class="ui active inline slow loader " style="color:#f38320;"></div>');    
                }
                
//                if(sync_state=="waiting" || sync_state==null){
//                $("#aliwa_main_update_button").css("margin-top","0.0rem").html('<div class="ui active inline loader slow elastic" style="color:red;"></div>');}
//            
//               
//                  console.error(sync_state)
                 //   show_popup_action(templ_loads,"info","waiting for server...",250);
            }
}
        
        
function view_send(user_inputs){
    window.scrollTo(0, 0);
    $("body").html(build_from_key("send")).hide();
    
    //manipulate
    $("#navbar_title").text("Send");
      
    if(transaction_current_send_number>0){
        $("#navbar_title").html('<span>Send</span><a id="view_send_transaction_number" class="ui circular label" style="background:#f38320;color:#fff;display: block;margin-left: 8rem;position: fixed;margin-top: -1.6rem !important;">'+(transaction_current_send_number+1)+'</a>');
    }
    
    if(transaction_current_send_number<transaction_send_list.length){
        $("#view_send_button_add span").html("&nbsp;Update");
        $("#view_send_button_add").find("i").removeClass("plus").addClass("check");
    }
    
    
    $("#view_send_button_show_list_number").text(transaction_send_list.length);
    
    //fill form from temp fill
     if(fill_send_address!=null){
         $("#view_send_input_destination").val(fill_send_address);
     }
     if(fill_send_label!=null){
         $("#view_send_input_label").val(fill_send_label);
     }
     if(fill_send_note!=null){
         $("#view_send_input_note").val(fill_send_note);
     }
     if(fill_send_amount!=null){
         $("#view_send_input_amount").val(fill_send_amount);
     }
    
    
    if(user_inputs!=undefined){
        if(user_inputs.send_address!=undefined){
          $("#view_send_input_destination").val(user_inputs.send_address);  
        }
        
        if(user_inputs.send_label!=undefined){
          $("#view_send_input_label").val(user_inputs.send_label);  
        }
    }
    //...
    
    $("body").fadeIn(100,"easeInOutQuad");
    
    $("#view_back_overview").off("click").on("click",function(){
        fill_send_form(false);
         view_overview();
     });
     $("#view_back_current").off("click").on("click",function(){
         fill_send_form(false);
         view_overview();
     });
     
     $("#view_send_button_copy").off("click").on("click",async function(){
          var clip_text=await navigator.clipboard.readText();
//          console.log(clip_text);
          $("#view_send_input_destination").val(clip_text.trim());
//          await set_label_from_contacts(); 
          $("#view_send_input_destination").trigger("change");            
     });
     
     $("#view_send_button_scan").off("click").on("click",async function(){
         fill_send_form(false);
          //cordova camera
          //qr reader
          //....
     });
     
     $("#view_send_button_address_book").off("click").on("click",function(){
         fill_send_form(false);
          view_address_book_contacts();
     });
     
     //add label from contacts
     last_dest_val_change="";
     $("#view_send_input_destination").off("change").on("change",async function(){
         await set_label_from_contacts();
     });
                
     //prepare input clearing
     input_clear_button_func("#view_send_input_destination","#view_send_input_destination_clear");
     input_clear_button_func("#view_send_input_label","#view_send_input_label_clear");
     input_clear_button_func("#view_send_input_note","#view_send_input_note_clear");
     input_clear_button_func("#view_send_input_amount","#view_send_input_amount_clear");
     
     
     set_view_send_currency();
     $("#view_send_input_amount").trigger("change");
     
     $("#send_currency_label").text(selected_currency);
     
     //show available balance
     if(global_balance!=null){
     $("#view_send_available_balance").text(numeral(global_balance.available).subtract(transaction_amount_sum).format("0.00000000"));}
     
     //max amount
     $("#view_send_button_max_amount").off("click").on("click",async function(){  
        if(global_balance==null){
            $("#view_send").transition('shake');
            show_popup_action(templ_loads,"error","Not synced!",250);
            return;
        }
            
        var max_get=await get_max_amount();
        if(max_get.max>0){
            $("#view_send_input_amount").val(max_get.max);
            $("#view_send_fee").text(numeral(max_get.fee).format("0.00000000")); 
            $("#view_send_input_amount").trigger("change");
        }
        else{
            show_popup_action(templ_loads,"error","Zero Balance",500);
        }
          
     });
     
     //clear form
     $("#view_send_button_clear").off("click").on("click",async function(){
       clear_send_form();  
     });
     
     //add transaction
     $("#view_send_button_add").off("click").on("click",async function(){
        add_update_send_list();
     });
     
     //show transaction list
     $("#view_send_button_show_list").off("click").on("click", async function () {
         
        if(transaction_current_send_number<transaction_send_list.length){   
            var list_update=await add_update_send_list();
            if(!list_update){return;}
        }
         
         
        var tx_dest = JSON.parse(JSON.stringify(transaction_send_list));
        if(tx_dest.length<1){show_popup_action(templ_loads,"error","List is empty!"); return;}
        var tx_info = await window.electron.ipcRenderer_invoke("get_raw_tx", tx_dest);
        if (tx_info == false) {
            show_popup_action(templ_loads, "error", "Unknown error");
            return;
        }

        var fee = tx_info.fee;
        $("#view_send_fee").text(numeral(fee).format("0.00000000"));
        var tx_text = "";
        var temp_tx_text = "";
        var total_send = numeral(0);
        total_send.add(fee);
        for (var i = 0; i < tx_dest.length; i++) {
            total_send.add(tx_dest[i].amount);
            temp_tx_text += '<p class="send_list_item"><i value="'+i+'" class="send_list_edit edit icon large aliwa_can_click">'                          
                     +'</i>'+"&nbsp;<b>Transaction " + (i + 1) + ": </b>" + numeral(tx_dest[i].amount).format("0.00[000000]") + " ALIAS -> " + (tx_dest[i].label!="" ? tx_dest[i].label : tx_dest[i].destination_address) + '&nbsp;<i value="'+i+'" class="send_list_remove times icon large aliwa_can_click" style="float:right;"></i>'+"<br>";
            if (tx_dest[i].narration != undefined) {
                temp_tx_text += "Narration: " + tx_dest[i].narration + "<br><br></p>";
            } else {
                temp_tx_text += "<br></p>";
            }
        }
        tx_text += '<b id="modal_send_list_send_total">Send Total: ' + numeral(total_send.value()).format("0.00[000000]")  + ' ALIAS </b> <span id="modal_send_list_send_total_fee" style="display:inline-block;">(incl. ' + fee + ' ALIAS fee)</span><div class="ui divider"></div><br>';
        tx_text += temp_tx_text;
        
                  
        show_dialogue_modal(templ_loads, "Transaction List", tx_text, "Send List", "OK", tx_dest,  function () {
             $('.ui.modal').modal("hide");
             setTimeout(function(){open_send_dialogue(true);},200);
        }, function () {},function(){
                $(".send_list_edit").off("click").on("click",async function(){
                    $("#view_send_button_add span").html("&nbsp;Update");
                    $("#view_send_button_add").find("i").removeClass("plus").addClass("check");
                     var i=parseInt($(this).attr("value"));
                     
                    $("#view_send_input_destination").val(transaction_send_list[i].destination_address);
                    $("#view_send_input_label").val(transaction_send_list[i].label);
                    $("#view_send_input_note").val(transaction_send_list[i].narration);
                    $("#view_send_input_amount").val(transaction_send_list[i].amount);
                    
                    transaction_current_send_number = i;
                    transaction_amount_sum=numeral(transaction_amount_sum).subtract(transaction_send_list[i].amount).value();
                    $("#view_send_available_balance").text(numeral(global_balance.available).subtract(transaction_amount_sum).format("0.00000000"));
                     $("#navbar_title").text("Send");
                    if(transaction_current_send_number>0){
                        $("#navbar_title").html('<span>Send</span><a id="view_send_transaction_number" class="ui circular label" style="background:#f38320;color:#fff;display: block;margin-left: 8rem;position: fixed;margin-top: -1.6rem !important;">'+(transaction_current_send_number+1)+'</a>');
                    }
                    
                     
                    $('.ui.modal').modal("hide"); 
                });
                
                send_list_remove_items();
                
            
           
                $(".dialogues_modal_actions").prepend('<div id="dialogues_modal_delete" class="ui dropdown icon button white" style="background: #fff;margin-top:1.5rem;float:left;margin-top:0rem;">'
                                            +'<div id="dialogues_modal_delete_popup" class="menu">'
                                                +'<div class="item" style="background: #fff;text-align: center">'
                                                    +' <b>Delete all transactions?</b><br><br> '              
                                                    +' <button id="dialogues_modal_delete_popup_confirm" class="ui button alias_orange_button2 ">OK</button>'
                                                    +' <button class="ui button black " style="background: #382b3f">Abort</button>'
                                                +'</div>'             
                                            +' </div>'
                                            +'<i class="times icon"></i> Delete All</div>'); 
                                                                                                                                                                           
                $("#dialogues_modal_delete").off("click").on("click",async function(){
                    var button_top_pos = $("#dialogues_modal_delete").position().top;
                    button_top_pos -= $("#dialogues_modal_delete_popup").height();
                    $("#dialogues_modal_delete_popup").css({position: "fixed", width: "90%", top: (button_top_pos - 10)});
                    $("#dialogues_modal_delete_popup").toggle();

                    $("#dialogues_modal_delete_popup_confirm").off("click").on("click", async function () {
                       $('.ui.modal').modal("hide"); 
                       fill_send_form(true); 
                    });
                });
                                             
            });
    });
     
     //send button
     $("#view_send_button_send_transaction").off("click").on("click",async function(){
          open_send_dialogue(false);    
     });     
}

function set_view_send_currency(){
    $("#view_send_input_amount").off("change").on("change",function(){
        set_view_send_currency();
        if(global_balance==null){
            $("#view_send").transition('shake');
//            show_popup_action(templ_loads,"error","Not synced!",250);
            return;
        }
        
        input_clear_button_func("#view_send_input_amount","#view_send_input_amount_clear");
        if(typeof selected_currency=="string"){
        var amount=($("#view_send_input_amount").val()=="" ? "0" : $("#view_send_input_amount").val()); 
        amount=amount.replace(",",".");  
        
        $("#send_currency_value").text(numeral((isNaN(amount) ? 0 : amount)).multiply(alias_prices[selected_currency.toString().toLowerCase()]).format("0.00000000"));}
         
     });
}

async function send_list_remove_items(){
    $(".send_list_remove").off("click").on("click", async function () {
                var i = parseInt($(this).attr("value"));
                transaction_send_list.splice(i,1);

                transaction_current_send_number = transaction_send_list.length;
                $("#navbar_title").text("Send");
                if (transaction_current_send_number > 0) {
                    $("#navbar_title").html('<span>Send</span><a id="view_send_transaction_number" class="ui circular label" style="background:#f38320;color:#fff;display: block;margin-left: 8rem;position: fixed;margin-top: -1.6rem !important;">' + (transaction_current_send_number + 1) + '</a>');
                }
                $("#view_send_button_show_list_number").text(transaction_send_list.length);
                clear_send_form();
                transaction_amount_sum = 0;
                for (var i = 0; i < transaction_send_list.length; i++) {
                    transaction_amount_sum = numeral(transaction_amount_sum).add(transaction_send_list[i].amount).value();
                }

                
                $("#view_send_available_balance").text(numeral(global_balance.available).subtract(transaction_amount_sum).format("0.00000000"));

                

                //update modal
                var tx_dest = JSON.parse(JSON.stringify(transaction_send_list));
                var tx_info = await window.electron.ipcRenderer_invoke("get_raw_tx", tx_dest);
                var fee = tx_info.fee;

                var total_send = numeral(0);
                total_send.add(fee);
                for (var i = 0; i < tx_dest.length; i++) {
                    total_send.add(tx_dest[i].amount);
                }


                   $("#modal_send_list_send_total").text("Send Total: " + numeral(total_send.value()).format("0.00[000000]")  + ' ALIAS ');
                   $("#modal_send_list_send_total_fee").text('(incl. ' + fee + ' ALIAS fee)');

                var i = 0;
                
                $(this).parent().hide(200, function () {
                    $(this).remove();
//                    console.log(tx_dest);
                    $(".send_list_item").each(function () {
                        if (i < tx_dest.length) {
                            var temp_tx_text = '<i value="' + i + '" class="send_list_edit edit icon large aliwa_can_click">'
                                    + '</i>' + "&nbsp;<b>Transaction " + (i + 1) + ": </b>" + numeral(tx_dest[i].amount).format("0.00[000000]") + " ALIAS -> " + (tx_dest[i].label!="" ? tx_dest[i].label : tx_dest[i].destination_address) + '&nbsp;<i value="' + i + '" class="send_list_remove times icon large aliwa_can_click" style="float:right;"></i>' + "<br>";
                            if (tx_dest[i].narration != undefined) {
                                temp_tx_text += "Narration: " + tx_dest[i].narration + "<br><br>";
                            } else {
                                temp_tx_text += "<br>";
                            }
//                            console.log($(this).html());

                            $(this).html(temp_tx_text);
                        }
                        i++;
                          
                    });
                    send_list_remove_items();
                });
                 
               
                
                      
                    
    
                   if(transaction_send_list.length<1){
                       $('.ui.modal').modal("hide"); 
                   }
                    
                /*    $('.ui.modal').modal({duration:0}).modal("hide");
                    clean_modal("modal");
                    
                    if(transaction_send_list.length>0){
                    setTimeout(function(){$("#view_send_button_show_list").trigger("click");},20);}*/
                });
}

async function add_update_send_list(){
    if(global_balance==null){
            $("#view_send").transition('shake');
            show_popup_action(templ_loads,"error","Not synced!",250);
            return false;
        }
    
    //check address
         var address=$("#view_send_input_destination").val();
         var label=$("#view_send_input_label").val();
         var narration=$("#view_send_input_note").val();
         var amount=$("#view_send_input_amount").val().replace(",",".");
         
         //cut if have more than 8 digits
         if(amount.includes(".")){
            var amount_split=amount.split(".");         
            var amount_digits=amount_split[1].length>8 ? amount_split[1].substring(0,8) : amount_split[1];
            amount=parseFloat(amount_split[0]+"."+amount_digits);
         }
         $("#view_send_input_amount").val(amount);
         
         var is_valid_form=await check_send_form(address,narration,amount,"#view_send_button_add");
         if(is_valid_form){
             $("#view_send_button_add span").html("&nbsp;Add");
             $("#view_send_button_add").find("i").removeClass("check").addClass("plus");
                        
            if(narration.length==0){
                if(transaction_send_list[transaction_current_send_number]!=null){
                   transaction_send_list[transaction_current_send_number]={amount:amount,destination_address:address,label:label};
                }
                else{
                    transaction_send_list.push({amount:amount,destination_address:address,label:label});                   
                }            
             }
             else{
                 if(transaction_send_list[transaction_current_send_number]!=null){
                   transaction_send_list[transaction_current_send_number]={amount:amount,destination_address:address,narration:narration,label:label};
                }
                else{
                    transaction_send_list.push({amount:amount,destination_address:address,narration:narration,label:label});   
                }                                
             }
             
             transaction_current_send_number=transaction_send_list.length;           
            if(transaction_current_send_number>0){
                $("#navbar_title").html('<span>Send</span><a id="view_send_transaction_number" class="ui circular label" style="background:#f38320;color:#fff;display: block;margin-left: 8rem;position: fixed;margin-top: -1.6rem !important;">'+(transaction_current_send_number+1)+'</a>');
            }
            $("#view_send_button_show_list_number").text(transaction_send_list.length);
            clear_send_form();
            transaction_amount_sum=0;
            for(var i=0;i<transaction_send_list.length;i++){
                transaction_amount_sum=numeral(transaction_amount_sum).add(transaction_send_list[i].amount).value();
            }
            
            $("#view_send_available_balance").text(numeral(global_balance.available).subtract(transaction_amount_sum).format("0.00000000"));
            return true;
         }
         return false;
}



async function open_send_dialogue(list_only){
    if(global_balance==null){
            $("#view_send").transition('shake');
            show_popup_action(templ_loads,"error","Not synced!",250);
            return false;
        }
    
    //check address
        if(!list_only){
         var address=$("#view_send_input_destination").val();
         var label=$("#view_send_input_label").val();
         var narration=$("#view_send_input_note").val();
         var amount=$("#view_send_input_amount").val().replace(",",".");
         
         //cut if have more than 8 digits
         if(amount.includes(".")){
            var amount_split=amount.split(".");         
            var amount_digits=amount_split[1].length>8 ? amount_split[1].substring(0,8) : amount_split[1];
            amount=parseFloat(amount_split[0]+"."+amount_digits);
         }
         $("#view_send_input_amount").val(amount);
         
         var is_valid_form=await check_send_form(address,narration,amount,"#view_send_button_send_transaction");
         }
         if(is_valid_form || list_only){
             if(transaction_current_send_number<transaction_send_list.length && !list_only){                
                  if(narration.length==0){
                  transaction_send_list[transaction_current_send_number]={amount:amount,destination_address:address,label:label};   
                }
                else{
                    transaction_send_list[transaction_current_send_number]={amount:amount,destination_address:address,narration:narration,label:label};   
                }
             }
             var tx_dest=JSON.parse(JSON.stringify(transaction_send_list));
             
             if(!list_only && transaction_current_send_number==transaction_send_list.length){
                if(narration.length==0){
                  tx_dest.push({amount:amount,destination_address:address,label:label});   
                }
                else{
                    tx_dest.push({amount:amount,destination_address:address,narration:narration,label:label});   
                }
             }
             var tx_info=await window.electron.ipcRenderer_invoke("get_raw_tx",tx_dest);
             if(tx_info==false){show_popup_action(templ_loads,"error","Unknown error"); return;}
             
             var fee=tx_info.fee;
             $("#view_send_fee").text(numeral(fee).format("0.00000000")); 
             var tx_text="";
             var temp_tx_text="";
             var total_send=numeral(0);
             total_send.add(fee);
             for(var i=0;i<tx_dest.length;i++){
                 total_send.add(tx_dest[i].amount);
                 temp_tx_text+="<b>Transaction "+(i+1)+": </b>"+ numeral(tx_dest[i].amount).format("0.00[000000]")+" ALIAS -> "+tx_dest[i].destination_address+"<br>";
                 if(tx_dest[i].narration!=undefined){
                    temp_tx_text+="Narration: "+tx_dest[i].narration+"<br><br>";
                 }
                else{temp_tx_text+="<br>"}
             }
             tx_text+="<b>Send Total: "+ numeral(total_send.value()).format("0.00[000000]") +' ALIAS </b> <span style="display:inline-block;">(incl. '+fee+' ALIAS fee)</span><div class="ui divider"></div><br>';
             tx_text+=temp_tx_text;
             
             var pw_result=await window.electron.ipcRenderer_invoke("compare_password","");
             show_dialogue_modal(templ_loads,"Confirm Transaction"+(tx_dest.length>1 ?"s" : "")+"?","Confirm the following transaction"+(tx_dest.length>1 ?"s" : "")+":<br><br>"+tx_text,(pw_result ? "Send Now":"Confirm"),"Abort",tx_dest,async function(){
                // ask for password                  
                 console.log("after dialogue:",tx_dest);
                 
                 if(pw_result){ // no password
                    await window.electron.ipcRenderer_invoke("send",tx_info); 
                    show_popup_action(templ_loads,"info",'<i class="coins icon"></i>&nbsp;Coins sent!',1500);
                    for(var i=0;i<tx_dest.length;i++){
                        await add_or_update_contact(tx_dest[i].destination_address,tx_dest[i].label);
                    }
                    fill_send_form(true);                   
                    setTimeout(function(){view_send();},1600);
                    
                 }
                 else{
                    setTimeout(function(){
                    show_dialogue_input(templ_loads,"Enter Password","Your password is required for this transaction.<br>","Password","password","Send Now","Abort","data",async function(){ 
                        var pw_result=await window.electron.ipcRenderer_invoke("compare_password",$("#dialogues_input_input").val());
                        if(pw_result){
                            await window.electron.ipcRenderer_invoke("send",tx_info);
                            show_popup_action(templ_loads,"info",'<i class="coins icon"></i>&nbsp;Coins sent!',1500);                           
                            $('.ui.modal').modal("hide");
                            for(var i=0;i<tx_dest.length;i++){
                                await add_or_update_contact(tx_dest[i].destination_address,tx_dest[i].label);
                            }
                            fill_send_form(true);                         
                            setTimeout(function(){view_send();},1600);
                        }
                        else{
                            $("#dialogues_input_yes").transition('shake');
                            show_popup_action(templ_loads,"error","Wrong password!"); 
                        }
                                                             
                 },async function(){});
                 },300);
                 }

                 
             },function(){});
             //valid tx--> ask for confirm --> ask for password --> send
             //--> change label
             
             //--> show success or not
             
         }  
}

function clear_send_form() {
    $("#view_send_input_destination").val("");
    $("#view_send_input_label").val("");
    $("#view_send_input_note").val("");
    $("#view_send_input_amount").val("");
}

async function add_or_update_contact(address,label) {
    if(label==""){return;}
    var can_add = await window.electron.ipcRenderer_invoke("add_new_contact_address", label, address);
    if (can_add == true) {       
    } else if (can_add == "duplicated label") {      
    } else if (can_add == "duplicated address") {
        await window.electron.ipcRenderer_invoke("change_contact_address_by_address", address,label);
    }

}

async function set_label_from_contacts(){
    if(last_dest_val_change!=$("#view_send_input_destination").val()){
             last_dest_val_change=$("#view_send_input_destination").val();
             if(last_dest_val_change!="" && last_dest_val_change.length==34){
                var list=await window.electron.ipcRenderer_invoke('list_contact_addresses',0, "pos", false,last_dest_val_change);
                if(list.result[0]!=undefined && list.result[0]!=null){
                    $("#view_send_input_label").val(list.result[0].label);
                }              
             }
             else{               
                 if($("#view_send_input_label").val().length<1){                    
                $("#view_send_input_label").val(fill_send_label);}   
             }
             
         }
//         else{
//            $("#view_send_input_label").val(fill_send_label);   
//         }        
         input_clear_button_func("#view_send_input_label","#view_send_input_label_clear");
         input_clear_button_func("#view_send_input_destination","#view_send_input_destination_clear");       
}

function fill_send_form(empty){
    if(empty) {
        fill_send_address = null;
        fill_send_label = null;
        fill_send_note = null;
        fill_send_amount = null;

        transaction_amount_sum = 0;
        transaction_send_list = [];
        transaction_current_send_number = 0;
        $("#navbar_title").html('<span>Send</span>');
        $("#view_send_button_show_list_number").text(transaction_send_list.length);
        $("#view_send_available_balance").text(numeral(global_balance.available).subtract(transaction_amount_sum).format("0.00000000"));
        
        $("#view_send_button_add span").html("&nbsp;Add");
        $("#view_send_button_add").find("i").removeClass("check").addClass("plus");

    }
    else{
        fill_send_address=$("#view_send_input_destination").val();
        fill_send_label=$("#view_send_input_label").val();
        fill_send_note=$("#view_send_input_note").val();
        fill_send_amount=$("#view_send_input_amount").val();
    }
}

async function check_send_form(address,narration,amount,shake_id){
//         var address=$("#view_send_input_destination").val();
//         var narration=$("#view_send_input_note").val();
//         var amount=$("#view_send_input_amount").val();
         
        if(!alias_address_check(address)){
            $(shake_id).transition('shake');
            show_popup_action(templ_loads,"error","Invalid Alias Address");
            return false;
         }
         if(narration.length>24){
            $(shake_id).transition('shake'); 
            show_popup_action(templ_loads,"error","Narration too long! Max. 24 characters allowed."); 
            return false;
         }       
         if(amount<=0 || amount=="" ||  isNaN(amount)){
            $(shake_id).transition('shake'); 
            show_popup_action(templ_loads,"error","Amount must be greater than zero!");
            return false;
         }
         var max=await get_max_amount();//
         if(amount>max.max){
            $(shake_id).transition('shake'); 
            show_popup_action(templ_loads,"error","Not enough funds! Amount is too big!"); 
            return false;
         } 
         
         //check duplicated destinations
         for(var i=0;i<transaction_send_list.length;i++){
             if(address==transaction_send_list[i].destination_address && transaction_current_send_number!=i){
                $(shake_id).transition('shake'); 
                show_popup_action(templ_loads,"error","Destination Address is duplicated!"); 
                return false;
             }
         }
         
         
         
         return true;
}

async function get_max_amount(destinations_for_send){
    var destinations=JSON.parse(JSON.stringify(transaction_send_list));   
    if(destinations_for_send==undefined)
    {
    
         var address=$("#view_send_input_destination").val();       
         var available_balance=$("#view_send_available_balance").text();
         var note=$("#view_send_input_note").val();
         
         if(!alias_address_check(address)){
            address="SdrdWNtjD7V6BSt3EyQZKCnZDkeE28cZhr";//calc fee with dummy address 
         }
         
         if(note.length>24){
            note=note.substring(0,24); 
         }
         
        
          if(transaction_current_send_number<transaction_send_list.length){                
                   if(note==""){destinations[transaction_current_send_number]={amount:available_balance,destination_address:address};}
                    else{destinations[transaction_current_send_number]={amount:available_balance,destination_address:address,narration:note};}
          }
          else{
              if(note==""){destinations.push({amount:available_balance,destination_address:address});}
         else{destinations.push({amount:available_balance,destination_address:address,narration:note});}
          }                        
     }
     else{
         destinations=JSON.parse(JSON.stringify(destinations_for_send));
     }
     
     
        var base_fee=0.0001;
        destinations[transaction_current_send_number].amount=numeral(destinations[transaction_current_send_number].amount).subtract(base_fee).value(); 
//        var start=new Date().getUTCMilliseconds();
        
        
        var fee=await window.electron.ipcRenderer_invoke("get_fee",destinations);
        if(fee.exceed!=undefined){
           destinations[transaction_current_send_number].amount=numeral(destinations[transaction_current_send_number].amount).subtract(fee.exceed).value();
           var max=destinations[transaction_current_send_number].amount;
//            console.log("wait: "+(new Date().getUTCMilliseconds()-start));
           return {max:max,fee:(numeral(base_fee).add(fee.exceed))};
        } 
        else{
           var max=destinations[transaction_current_send_number].amount;
//           console.log("wait: "+(new Date().getUTCMilliseconds()-start));
           return {max:max,fee:(numeral(base_fee))};
        }      
}

async function view_receive(){
    window.scrollTo(0, 0);
    $("body").html(build_from_key("receive")).hide();
    
    //manipulate
    $("#navbar_title").text("Receive");
    var address_obj=await window.electron.ipcRenderer_invoke("get_latest_receive_addr");
    show_qr_code("view_qr_code",address_obj.address);
    //...
    
    $("body").fadeIn(100,"easeInOutQuad");
    
    $("#view_back_overview").off("click").on("click",function(){
         window.electron.ipcRenderer_invoke("save_wallet",null);
         view_overview();
     });
     $("#view_back_current").off("click").on("click",function(){
         window.electron.ipcRenderer_invoke("save_wallet",null);
         view_overview();
     });
     
     
     
     
     $("#view_receive_address_address").text(address_obj.address);
     $("#view_receive_address_label").text(address_obj.label);
     $("#view_receive_address_label_input").val(address_obj.label!=null ? address_obj.label : "");
     
     $("#view_receive_address_hdkey").text("Your Current ALIAS Address (HD #"+(address_obj.pos+1)+")");
     
     
     input_clear_button_func("#view_receive_address_label_input","#view_receive_address_label_input_clear");
     
     $("#view_receive_address_label_input").off("change").on("change",async function(){
         $("#view_receive_address_label").text($("#view_receive_address_label_input").val());
         var result=await window.electron.ipcRenderer_invoke("change_receive_address_label",address_obj.pos,$("#view_receive_address_label_input").val());
         if(result=="duplicated"){
             show_popup_action(templ_loads,"error","Label is duplicated!");   
         }
     });
     
//     $("#view_receive_address_label_input").off("input").on("input",function(){
//         $("#view_receive_address_label").text($("#view_receive_address_label_input").val());
//     });
     
     $("#view_receive_copy_button").off("click").on("click",function(){
          navigator.clipboard.writeText($("#view_receive_address_address").text());
         show_popup_action(templ_loads,"info","Address copied");
     });
     
     $("#view_receive_receive_payment_button").off("click").on("click",function(){
         window.electron.ipcRenderer_invoke("save_wallet",null);
         view_receive_payment();
     });
     
    
    
      
}

async function view_receive_payment(address_obj){
    window.scrollTo(0, 0);
    $("body").html(build_from_key("receive_payment")).hide();
    
    //manipulate
    $("#navbar_title").text("Receive Payment");
    
    //...
    
    $("body").fadeIn(100,"easeInOutQuad");
    
    $("#view_back_overview").off("click").on("click",function(){
         window.electron.ipcRenderer_invoke("save_wallet",null);
         view_overview();
     });
     $("#view_back_current").off("click").on("click",function(){
         window.electron.ipcRenderer_invoke("save_wallet",null);       
         view_overview();
     });
     
     
     if(address_obj==undefined){
        address_obj=await window.electron.ipcRenderer_invoke("get_latest_receive_addr");
     }
     var qrcode=show_qr_code("view_qr_code",address_obj.address);
     $("#view_receive_payment_address_address").text(address_obj.address);
     $("#view_receive_payment_address_label").text(address_obj.label);
     $("#view_receive_payment_label_input").val(address_obj.label!=null ? address_obj.label : "");
     
     $("#view_receive_payment_address_hdkey").text("Your Current ALIAS Address (HD #"+(address_obj.pos+1)+")");
     
     
     input_clear_button_func("#view_receive_payment_label_input","#view_receive_payment_label_input_clear");
     input_clear_button_func("#view_receive_payment_amount_input","#view_receive_payment_amount_input_clear");
     input_clear_button_func("#view_receive_payment_note_input","#view_receive_payment_note_input_clear");
     
     
//     encodeURIComponent
     
     $("#view_receive_payment_label_input").off("change").on("change",async function(){         
         $("#view_receive_payment_address_label").text($("#view_receive_payment_label_input").val());       
         var result =await window.electron.ipcRenderer_invoke("change_receive_address_label",address_obj.pos,$("#view_receive_payment_label_input").val());
         if(result=="duplicated"){
             show_popup_action(templ_loads,"error","Label is duplicated!");  
             return;
         }
         
         $("#view_receive_payment_qr_loader").addClass("active");
         payment_last_update_time=(new Date().getTime());
              setTimeout(async function(){
               if(new Date().getTime()-payment_last_update_time > 400){
                    payment_last_update_time=(new Date().getTime());                                      
                    $("#view_receive_payment_qr_loader").removeClass("active"); 
                    var qr_text="alias:"+address_obj.address+"?label="+encodeURIComponent($("#view_receive_payment_address_label").text())+"&narration="+encodeURIComponent($("#view_receive_payment_note_input").val())+"&amount="+encodeURIComponent($("#view_receive_payment_amount_input").val())+"";
                    qrcode.makeCode(qr_text); 
                    console.log(qr_text);
               }   
              },500); 
         
     });
     
     $("#view_receive_payment_note_input").off("change").on("change",async function(){
         $("#view_receive_payment_qr_loader").addClass("active");
         payment_last_update_time=(new Date().getTime());
              setTimeout(async function(){
               if(new Date().getTime()-payment_last_update_time > 400){
                    payment_last_update_time=(new Date().getTime());                                      
                    $("#view_receive_payment_qr_loader").removeClass("active"); 
                    var qr_text="alias:"+address_obj.address+"?label="+encodeURIComponent($("#view_receive_payment_address_label").text())+"&narration="+encodeURIComponent($("#view_receive_payment_note_input").val())+"&amount="+encodeURIComponent($("#view_receive_payment_amount_input").val())+"";
                    qrcode.makeCode(qr_text); 
                    console.log(qr_text);
               }   
              },500); 
     });
     $("#view_receive_payment_amount_input").off("change").on("change",async function(){
         $("#view_receive_payment_qr_loader").addClass("active");
         payment_last_update_time=(new Date().getTime());
              setTimeout(async function(){
               if(new Date().getTime()-payment_last_update_time > 400){
                    payment_last_update_time=(new Date().getTime());                                      
                    $("#view_receive_payment_qr_loader").removeClass("active"); 
                    var qr_text="alias:"+address_obj.address+"?label="+encodeURIComponent($("#view_receive_payment_address_label").text())+"&narration="+encodeURIComponent($("#view_receive_payment_note_input").val())+"&amount="+encodeURIComponent($("#view_receive_payment_amount_input").val())+"";
                    qrcode.makeCode(qr_text); 
                    console.log(qr_text);
               }   
              },500); 
     });
     
     
//     $("#view_receive_payment_address_label_input").off("input").on("input",function(){
//         $("#view_receive_payment_address_label").text($("#view_receive_payment_address_label_input").val());
//     });
     
     $("#view_receive_payment_copy_button").off("click").on("click",function(){        
         navigator.clipboard.writeText("alias:"+address_obj.address+"?label="+encodeURIComponent($("#view_receive_payment_address_label").text())+"&narration="+encodeURIComponent($("#view_receive_payment_note_input").val())+"&amount="+encodeURIComponent($("#view_receive_payment_amount_input").val())+"");
         show_popup_action(templ_loads,"info","Payment copied");                           
     });
            
}

async function view_address_book_contacts(){
    window.scrollTo(0, 0);
    $("body").html(build_from_key("address_book_contacts")).hide();
    
    //manipulate
    $("#navbar_title").text("Address Book");
    $("#tab_first").html('<i class="address book outline icon"></i>&nbsp;Contacts');
    $("#tab_second").html('<i class="arrow down icon"></i>&nbsp;Receiving');
    var j_load=await address_book_contacts_pagination();
    $('#address_book_tab_content').html(j_load);
    //...
    
    $("body").fadeIn(100,"easeInOutQuad");
    $('.menu .item').tab();
    
    $("#view_back_overview").off("click").on("click",function(){
         view_overview();
     });
     $("#view_back_current").off("click").on("click",function(){
         view_overview();
     });
     
    address_book_contacts_actions();
     
}

async function address_book_contacts_pagination(){
    var j_clone=$(templ_loads["address_book_contacts"]).html();
    
    j_clone=$("<div>"+j_clone+"</div>");
    
                 
    var list=await window.electron.ipcRenderer_invoke('list_contact_addresses',addressbook_contacts_sorting.page, addressbook_contacts_sorting.field, addressbook_contacts_sorting.descending,addressbook_contacts_sorting.search);    
    var table_list="";
    for(var i=0;i<list.result.length;i++){
        table_list+='<tr class="address_book_line_contacts">'
                +'<td data-label="ID" >'+(list.result[i].pos+1)+'</td>'
                +'<td data-label="Label">'+(list.result[i].label==null ? "" :list.result[i].label)+'</td>'
                +'<td data-label="Address">'+list.result[i].address+'</td>'
                +'</tr>';
    }
     j_clone.find("#view_address_book_contacts_table_body").html(table_list);
     
     
     //pagination
    var page=list.page;
    var page_max=list.page_max-1;
    if(page<1){j_clone.find("#view_address_book_contacts_pagination_container_left_arrow").addClass("disabled");}
    if(page>=page_max){j_clone.find("#view_address_book_contacts_pagination_container_right_arrow").addClass("disabled");}
    
    if(page==0){j_clone.find("#view_address_book_contacts_pagination_container_page_first").hide();}
    else{j_clone.find("#view_address_book_contacts_pagination_container_page_first").text(1);}
    
       
    if(page<2){j_clone.find("#view_address_book_contacts_pagination_container_page_second").hide();}
    if(page-1==1){j_clone.find("#view_address_book_contacts_pagination_container_page_second").text(2);}
    
    
    
    j_clone.find("#view_address_book_contacts_pagination_container_page_third").text((page+1));
    if(page+1>=page_max && page+2!=page_max){j_clone.find("#view_address_book_contacts_pagination_container_page_fourth").hide();}
    if(page+1==page_max-1){j_clone.find("#view_address_book_contacts_pagination_container_page_fourth").text(page+2)}
    
    j_clone.find("#view_address_book_contacts_pagination_container_page_fifth").text(page_max+1)
    if(page>=page_max){ j_clone.find("#view_address_book_contacts_pagination_container_page_fifth").hide();}
     
    
    return j_clone;                   
}




function address_book_contacts_actions(){  
    if(addressbook_contacts_sorting.search!=null && typeof(addressbook_contacts_sorting.search) == "string"){      
        $("#view_address_book_contacts_input_search").val(addressbook_contacts_sorting.search);       
    }
    
    
   $('#tab_second').off("click").on("click",function(){
        tab_address_book_receiving();           
     }); 
     
    $(".address_book_line_contacts").off("click").on("click",function(){
       show_dialogue_address($(this),templ_loads,"contacts");
       
     }); 
     
     $("#address_book_contacts_add_contact").off("click").on("click",function(){
         show_dialogue_input(templ_loads,"Add Contact","Enter a label and an ALIAS address.<br>","Label","text","OK","Abort","data",async function(){                                 
                        var label=$("#dialogues_input_input").val();
                        var address=$("#dialogues_input_input2").val();
                        
                        if(!alias_address_check(address)){
                        $("#dialogues_input_yes").transition('shake');
                            show_popup_action(templ_loads,"error","Invalid Alias address!");   
                            return;
                         }
                        
                        
                         var can_add=await window.electron.ipcRenderer_invoke("add_new_contact_address",label,address);
                       // var pw_result=await window.electron.ipcRenderer_invoke("compare_password",$("#dialogues_input_input").val());
                        if(can_add==true){
                             show_popup_action(templ_loads,"info","Contact added"); 
                             window.electron.ipcRenderer_invoke("save_wallet",null);
                             $('.ui.modal').modal("hide");
                             addressbook_contacts_sorting.page=0;
                             var j_clone=await address_book_contacts_pagination();
                             $('#address_book_tab_content').html(j_clone);
                             address_book_contacts_actions();
                        }
                        else if(can_add=="duplicated label"){
                            $("#dialogues_input_yes").transition('shake');
                             show_popup_action(templ_loads,"error","Label is duplicated!");                         
                        }
                        else if (can_add=="duplicated address"){
                              $("#dialogues_input_yes").transition('shake');
                              show_popup_action(templ_loads,"error","Address is duplicated!"); 
                        }
                        else{
                             $("#dialogues_input_yes").transition('shake');
                             show_popup_action(templ_loads,"error","Unknown error has occured!");                                                     
                        }
                                                             
                 },async function(){},[{input_name:"Address",input_type:"text"}]);
     });
     
     
     //pagination action
     $("#view_address_book_contacts_pagination_container_left_arrow").off("click").on("click",async function(){
                var cur_num=parseInt($("#view_address_book_contacts_pagination_container_page_third").text());
                addressbook_contacts_sorting.page=cur_num-2;
                var j_clone=await address_book_contacts_pagination();
                $('#address_book_tab_content').html(j_clone);
                address_book_contacts_actions();
          });
          
          $("#view_address_book_contacts_pagination_container_right_arrow").off("click").on("click",async function(){
                var cur_num=parseInt($("#view_address_book_contacts_pagination_container_page_third").text());
                addressbook_contacts_sorting.page=cur_num;
                var j_clone=await address_book_contacts_pagination();
                 $('#address_book_tab_content').html(j_clone);
                 address_book_contacts_actions();
          });
          
          $(".tx_pagination_item_num").off("click").on("click",async function(){
              if(!isNaN(parseInt($(this).text()))){
                addressbook_contacts_sorting.page=parseInt($(this).text())-1;  
                var j_clone=await address_book_contacts_pagination();                
                $('#address_book_tab_content').html(j_clone);
                 address_book_contacts_actions();
              }
            
          });
          
          input_clear_button_func("#address_book_contacts_pagination_goto_input","#address_book_contacts_pagination_goto_input_clear");
          
          $("#address_book_contacts_pagination_goto_button").off("click").on("click",async function(){
//              var max=parseInt($("#view_address_book_contacts_pagination_container_page_fifth").text()-1);
                var page=parseInt($("#address_book_contacts_pagination_goto_input").val())-1;
                if(page>=0 && page <= parseInt($("#view_address_book_contacts_pagination_container_page_fifth").text())-1){
                    addressbook_contacts_sorting.page=page;
                    var j_clone=await address_book_contacts_pagination();
                    $('#address_book_tab_content').html(j_clone);
                    address_book_contacts_actions();
                }
          });
                  
          //search
          input_clear_button_func("#view_address_book_contacts_input_search","#view_address_book_contacts_input_search_clear");
          $("#view_address_book_contacts_input_search").off("change").on("change",function(){
              if(addressbook_contacts_sorting.search==$("#view_address_book_contacts_input_search").val()){return;}
              addressbook_contacts_last_search_time=(new Date().getTime());  
              addressbook_contacts_sorting.search=$("#view_address_book_contacts_input_search").val();
              
              if((addressbook_contacts_sorting.search!=null && typeof(addressbook_contacts_sorting.search) == "string") || $("#view_address_book_contacts_input_search").val()==""){               
              setTimeout(async function(){               
               if(new Date().getTime()-addressbook_contacts_last_search_time > 400){
                 
                    console.log("SEARCH TRIGGERED with page: "+addressbook_contacts_sorting.page+" | " +addressbook_contacts_sorting.search);
                 addressbook_contacts_last_search_time=(new Date().getTime()); 
//                 addressbook_contacts_sorting.search=$("#view_transactions_input_search").val();
                 addressbook_contacts_sorting.page=0;             
                 var j_clone=await address_book_contacts_pagination();
                
                 $('table').html(j_clone.find("table").html());              
////                 $("#view_transactions_input_search").focus();
                 address_book_contacts_actions();             
               }   
              },500);
                  
              }
          });
          
          
          
          //sorting
          $("#view_address_book_contacts_header").find("i").remove("i"); //remove all carets
          switch (addressbook_contacts_sorting.field){
              case "pos":if(addressbook_contacts_sorting.descending){$("#view_address_book_contacts_header_pos").append('<i class="caret down icon"></i>');}
                            else{$("#view_address_book_contacts_header_pos").append('<i class="caret up icon"></i>');}break;
              case "label":if(addressbook_contacts_sorting.descending){$("#view_address_book_contacts_header_label").append('<i class="caret down icon"></i>');}
                            else{$("#view_address_book_contacts_header_label").append('<i class="caret up icon"></i>');}break;           
              case "address":if(addressbook_contacts_sorting.descending){$("#view_address_book_contacts_header_address").append('<i class="caret down icon"></i>');}
                            else{$("#view_address_book_contacts_header_address").append('<i class="caret up icon"></i>');}break;              
                    
          }
          
          
          $("#view_address_book_contacts_header_pos").off("click").on("click",async function(){          
            if($(this).find("i").hasClass("up")){
                addressbook_contacts_sorting.page=0;
                addressbook_contacts_sorting.field="pos";
                addressbook_contacts_sorting.descending=true;
                var j_clone=await address_book_contacts_pagination();
                $('#address_book_tab_content').html(j_clone);
                address_book_contacts_actions();                          
            }
            else{
                addressbook_contacts_sorting.page=0;
                addressbook_contacts_sorting.field="pos";
                addressbook_contacts_sorting.descending=false;
                var j_clone=await address_book_contacts_pagination();
                $('#address_book_tab_content').html(j_clone);
                address_book_contacts_actions();    
            }
          });
                                    
          $("#view_address_book_contacts_header_label").off("click").on("click",async function(){          
            if($(this).find("i").hasClass("up")){
                addressbook_contacts_sorting.page=0;
                addressbook_contacts_sorting.field="label";
                addressbook_contacts_sorting.descending=true;
                var j_clone=await address_book_contacts_pagination();
                $('#address_book_tab_content').html(j_clone);
                address_book_contacts_actions();                          
            }
            else{
                addressbook_contacts_sorting.page=0;
                addressbook_contacts_sorting.field="label";
                addressbook_contacts_sorting.descending=false;
                var j_clone=await address_book_contacts_pagination();
                $('#address_book_tab_content').html(j_clone);
                address_book_contacts_actions();    
            }
          });
          
           $("#view_address_book_contacts_header_address").off("click").on("click",async function(){          
            if($(this).find("i").hasClass("up")){
                addressbook_contacts_sorting.page=0;
                addressbook_contacts_sorting.field="address";
                addressbook_contacts_sorting.descending=true;
                var j_clone=await address_book_contacts_pagination();
                $('#address_book_tab_content').html(j_clone);
                address_book_contacts_actions();                               
            }
            else{
                addressbook_contacts_sorting.page=0;
                addressbook_contacts_sorting.field="address";
                addressbook_contacts_sorting.descending=false;
                var j_clone=await address_book_contacts_pagination();
                $('#address_book_tab_content').html(j_clone);
                address_book_contacts_actions();   
            }
          });    
     
     
}

async function tab_address_book_contacts(){ 
    //set tab
    $('#tab_first').off("click");
    
   $("#tab_second").removeClass("active");
   $("#tab_first").removeClass("active");
   $("#tab_first").addClass("active");
          
     var j_load=await address_book_contacts_pagination();
     //manipulate
     
     //transition
     $('#address_book_tab_content').transition('slide left',50,function(){
          $('#address_book_tab_content').html(j_load);
          address_book_contacts_actions();
     },"easeInOutQuad").transition('slide right',100,"easeInOutQuad");
     
}

async function tab_address_book_receiving(){
    //set tab
    $('#tab_second').off("click");
    
    $("#tab_second").removeClass("active");
    $("#tab_first").removeClass("active");
    $("#tab_second").addClass("active");
    
    
     var j_load=await address_book_receive_pagination();
     
     //transition
     $('#address_book_tab_content').transition('slide right',50,function(){
          $('#address_book_tab_content').html(j_load);
          address_book_receiving_actions();
     },"easeInOutQuad").transition('slide left',100,"easeInOutQuad");
          
            
}

async function address_book_receive_pagination(){
    var j_clone=$(templ_loads["address_book_receiving"]).html();
    j_clone=$("<div>"+j_clone+"</div>"); //replace parent address_book_tab_content with div
     //manipulate before insert
           
    var list=await window.electron.ipcRenderer_invoke('list_receive_addresses',addressbook_receiving_sorting.page, addressbook_receiving_sorting.field, addressbook_receiving_sorting.descending,addressbook_receiving_sorting.search);    
    var table_list="";
    for(var i=0;i<list.result.length;i++){
        table_list+='<tr class="address_book_line_receiving">'
                +'<td data-label="HD #" >'+(list.result[i].pos+1)+'</td>'
                +'<td data-label="Label">'+(list.result[i].label==null ? "" :list.result[i].label)+'</td>'
                +'<td data-label="Address">'+list.result[i].address+'</td>'
                +'</tr>';
    }
     j_clone.find("#view_address_book_receive_table_body").html(table_list);
     
     
     //pagination
    var page=list.page;
    var page_max=list.page_max-1;
    if(page<1){j_clone.find("#view_address_book_receive_pagination_container_left_arrow").addClass("disabled");}
    if(page>=page_max){j_clone.find("#view_address_book_receive_pagination_container_right_arrow").addClass("disabled");}
    
    if(page==0){j_clone.find("#view_address_book_receive_pagination_container_page_first").hide();}
    else{j_clone.find("#view_address_book_receive_pagination_container_page_first").text(1);}
    
       
    if(page<2){j_clone.find("#view_address_book_receive_pagination_container_page_second").hide();}
    if(page-1==1){j_clone.find("#view_address_book_receive_pagination_container_page_second").text(2);}
    
    
    
    j_clone.find("#view_address_book_receive_pagination_container_page_third").text((page+1));
    if(page+1>=page_max && page+2!=page_max){j_clone.find("#view_address_book_receive_pagination_container_page_fourth").hide();}
    if(page+1==page_max-1){j_clone.find("#view_address_book_receive_pagination_container_page_fourth").text(page+2)}
    
    j_clone.find("#view_address_book_receive_pagination_container_page_fifth").text(page_max+1)
    if(page>=page_max){ j_clone.find("#view_address_book_receive_pagination_container_page_fifth").hide();}
     
    console.log("j_clone of address_book_receive_pagination: ",j_clone.html());
    return j_clone;                   
}

function address_book_receiving_actions(){
     if(addressbook_receiving_sorting.search!=null && typeof(addressbook_receiving_sorting.search) == "string"){      
        $("#view_address_book_receive_input_search").val(addressbook_receiving_sorting.search);       
    }
    
    
    
    $('#tab_first').off("click").on('click',function(){
          tab_address_book_contacts();
      }); 
      
      $(".address_book_line_receiving").off("click").on("click",function(){
       show_dialogue_address($(this),templ_loads,"receiving");       
     });  
     
     $("#address_book_receive_new_address").off("click").on("click",async function(){
        var pw_result=await window.electron.ipcRenderer_invoke("compare_password",""); 
        if (pw_result) {
            add_new_receiving_address_dialogue();
        } else {

            show_dialogue_input(templ_loads, "Enter Password", "Your password is required.<br>", "Password", "password", "OK", "Abort", "data", async function () {
                var pw_result = await window.electron.ipcRenderer_invoke("compare_password", $("#dialogues_input_input").val());
                if (pw_result) {
                   
                   $('.ui.modal').modal("hide");
                    clean_modal("input");
                   setTimeout(function(){add_new_receiving_address_dialogue();},300);
                } else {
                    $("#dialogues_input_yes").transition('shake');
                    show_popup_action(templ_loads, "error", "Wrong password!");
                }

            }, async function () {});
        } 
           
     });
     
     //pagination action
     $("#view_address_book_receive_pagination_container_left_arrow").off("click").on("click",async function(){
                var cur_num=parseInt($("#view_address_book_receive_pagination_container_page_third").text());
                addressbook_receiving_sorting.page=cur_num-2;
                var j_clone=await address_book_receive_pagination();
                $('#address_book_tab_content').html(j_clone);
                address_book_receiving_actions();
          });
          
          $("#view_address_book_receive_pagination_container_right_arrow").off("click").on("click",async function(){
                var cur_num=parseInt($("#view_address_book_receive_pagination_container_page_third").text());
                addressbook_receiving_sorting.page=cur_num;
                var j_clone=await address_book_receive_pagination();
                 $('#address_book_tab_content').html(j_clone);
                 address_book_receiving_actions();
          });
          
          $(".tx_pagination_item_num").off("click").on("click",async function(){
              if(!isNaN(parseInt($(this).text()))){
                addressbook_receiving_sorting.page=parseInt($(this).text())-1;  
                var j_clone=await address_book_receive_pagination();                
                $('#address_book_tab_content').html(j_clone);
                 address_book_receiving_actions();
              }
            
          });
          
          input_clear_button_func("#address_book_receive_pagination_goto_input","#address_book_receive_pagination_goto_input_clear");
          
          $("#address_book_receive_pagination_goto_button").off("click").on("click",async function(){
//              var max=parseInt($("#view_address_book_receive_pagination_container_page_fifth").text()-1);
                var page=parseInt($("#address_book_receive_pagination_goto_input").val())-1;
                if(page>=0 && page <= parseInt($("#view_address_book_receive_pagination_container_page_fifth").text())-1){
                    addressbook_receiving_sorting.page=page;
                    var j_clone=await address_book_receive_pagination();
                    $('#address_book_tab_content').html(j_clone);
                    address_book_receiving_actions();
                }
          });
                  
          //search
          input_clear_button_func("#view_address_book_receive_input_search","#view_address_book_receive_input_search_clear");
          $("#view_address_book_receive_input_search").off("change").on("change",function(){
              if(addressbook_receiving_sorting.search==$("#view_address_book_receive_input_search").val()){return;}
              addressbook_receiving_last_search_time=(new Date().getTime());  
              addressbook_receiving_sorting.search=$("#view_address_book_receive_input_search").val();
              
              if((addressbook_receiving_sorting.search!=null && typeof(addressbook_receiving_sorting.search) == "string") || $("#view_address_book_receive_input_search").val()==""){               
              setTimeout(async function(){               
               if(new Date().getTime()-addressbook_receiving_last_search_time > 400){
                 
                    console.log("SEARCH TRIGGERED with page: "+addressbook_receiving_sorting.page+" | " +addressbook_receiving_sorting.search);
                 addressbook_receiving_last_search_time=(new Date().getTime()); 
//                 addressbook_receiving_sorting.search=$("#view_transactions_input_search").val();
                 addressbook_receiving_sorting.page=0;             
                 var j_clone=await address_book_receive_pagination();
                
                 $('table').html(j_clone.find("table").html());              
////                 $("#view_transactions_input_search").focus();
                 address_book_receiving_actions();             
               }   
              },500);
                  
              }
          });
          
          
          
          //sorting
          $("#view_address_book_receive_header").find("i").remove("i"); //remove all carets
          switch (addressbook_receiving_sorting.field){
              case "pos":if(addressbook_receiving_sorting.descending){$("#view_address_book_receive_header_pos").append('<i class="caret down icon"></i>');}
                            else{$("#view_address_book_receive_header_pos").append('<i class="caret up icon"></i>');}break;
              case "label":if(addressbook_receiving_sorting.descending){$("#view_address_book_receive_header_label").append('<i class="caret down icon"></i>');}
                            else{$("#view_address_book_receive_header_label").append('<i class="caret up icon"></i>');}break;           
              case "address":if(addressbook_receiving_sorting.descending){$("#view_address_book_receive_header_address").append('<i class="caret down icon"></i>');}
                            else{$("#view_address_book_receive_header_address").append('<i class="caret up icon"></i>');}break;              
                    
          }
          
          
          $("#view_address_book_receive_header_pos").off("click").on("click",async function(){          
            if($(this).find("i").hasClass("up")){
                addressbook_receiving_sorting.page=0;
                addressbook_receiving_sorting.field="pos";
                addressbook_receiving_sorting.descending=true;
                var j_clone=await address_book_receive_pagination();
                $('#address_book_tab_content').html(j_clone);
                address_book_receiving_actions();                          
            }
            else{
                addressbook_receiving_sorting.page=0;
                addressbook_receiving_sorting.field="pos";
                addressbook_receiving_sorting.descending=false;
                var j_clone=await address_book_receive_pagination();
                $('#address_book_tab_content').html(j_clone);
                address_book_receiving_actions();    
            }
          });
                                    
          $("#view_address_book_receive_header_label").off("click").on("click",async function(){          
            if($(this).find("i").hasClass("up")){
                addressbook_receiving_sorting.page=0;
                addressbook_receiving_sorting.field="label";
                addressbook_receiving_sorting.descending=true;
                var j_clone=await address_book_receive_pagination();
                $('#address_book_tab_content').html(j_clone);
                address_book_receiving_actions();                          
            }
            else{
                addressbook_receiving_sorting.page=0;
                addressbook_receiving_sorting.field="label";
                addressbook_receiving_sorting.descending=false;
                var j_clone=await address_book_receive_pagination();
                $('#address_book_tab_content').html(j_clone);
                address_book_receiving_actions();    
            }
          });
          
           $("#view_address_book_receive_header_address").off("click").on("click",async function(){          
            if($(this).find("i").hasClass("up")){
                addressbook_receiving_sorting.page=0;
                addressbook_receiving_sorting.field="address";
                addressbook_receiving_sorting.descending=true;
                var j_clone=await address_book_receive_pagination();
                $('#address_book_tab_content').html(j_clone);
                address_book_receiving_actions();                               
            }
            else{
                addressbook_receiving_sorting.page=0;
                addressbook_receiving_sorting.field="address";
                addressbook_receiving_sorting.descending=false;
                var j_clone=await address_book_receive_pagination();
                $('#address_book_tab_content').html(j_clone);
                address_book_receiving_actions();   
            }
          });
          
          
          
}

function add_new_receiving_address_dialogue(){
    show_dialogue_input(templ_loads,"New Address","Enter a label for your new address. (optional)<br>","Label (optional)","text","OK","Abort","data",async function(){ 
                        var can_add=await window.electron.ipcRenderer_invoke("add_new_receive_addr",$("#dialogues_input_input").val());
                       // var pw_result=await window.electron.ipcRenderer_invoke("compare_password",$("#dialogues_input_input").val());
                        if(can_add==true){
                             show_popup_action(templ_loads,"info","Address added"); 
                             window.electron.ipcRenderer_invoke("save_wallet",null);
                             $('.ui.modal').modal("hide");
                             addressbook_receiving_sorting.page=0;
                             var j_clone=await address_book_receive_pagination();
                             $('#address_book_tab_content').html(j_clone);
                             address_book_receiving_actions();
                        }
                        else if(can_add=="duplicated"){
                            $("#dialogues_input_yes").transition('shake');
                             show_popup_action(templ_loads,"error","Label is duplicated!");                         
                        }
                        else if (can_add=="unused"){
                              $("#dialogues_input_yes").transition('shake');
                              show_popup_action(templ_loads,"error","More than 20 unused addresses!"); 
                        }
                        else{
                             $("#dialogues_input_yes").transition('shake');
                             show_popup_action(templ_loads,"error","Unknown error has occured!");                                                     
                        }
                                                             
                 },async function(){});
}



async function view_settings(){
    window.scrollTo(0, 0);
    var j_load=$(build_from_key("settings"));
    
    var has_no_password=await window.electron.ipcRenderer_invoke("compare_password","");
    var has_backup=await window.electron.ipcRenderer_invoke("has_backup");
    
    //manipulate

    $("body").html(j_load).hide().fadeIn(250,"easeInOutQuad"); 
    $("#navbar_title").text("Settings");
//    $("#view_settings_menu").hide().show("slide", { direction: "down" }, 100,"easeInOutQuad");
    $("#view_settings_menu_slider_place").animate({height:"-=30vh"},500,"easeOutQuint",function(){
        $("#view_settings_menu_slider_place").hide();
    });
    
       
    $("#view_back_overview").off("click").on("click",function(){
         view_overview();
     });
     $("#view_back_current").off("click").on("click",function(){
         view_overview();
     });
     
     //settings
     $("#settings_backup").off("click").on("click",function(){
         view_backup();
     });
     
     $("#settings_password").off("click").on("click",function(){
         view_set_password();
     });
     
     $("#settings_backup_phrase").off("click").on("click",function(){
         view_backup_phrase();
     });
     
     $("#settings_native_currency").off("click").on("click",function(){
         view_native_currency();
     });
     
      if(!has_no_password){
//        $("#settings_password i:nth-child(3)").remove();
         $("#settings_password i:nth-child(3)").removeClass("red exclamation circle").addClass("lock"); 
      }
      if(has_backup){
//        $("#settings_password i:nth-child(3)").remove();
         $("#settings_backup i:nth-child(3)").removeClass("red exclamation circle").addClass("check"); 
      }
      
      
      $("#settings_native_currency_value").text(selected_currency!=null ? selected_currency : "USD");
      
      
      
      if(notifications_enabled){
        $("#Settings_notifications_enabled").find("label").text('ON'); 
        $("#Settings_notifications_enabled").find("input[type=checkbox]").prop("checked",true);
      }
      else{
        $("#Settings_notifications_enabled").find("label").text('OFF'); 
        $("#Settings_notifications_enabled").find("input[type=checkbox]").prop("checked",false);
      }
      
      $("#Settings_notifications_enabled").off("click").on("click", async function (e) {
          e.preventDefault();
          console.log('$(this).find("input[type=checkbox]").prop("checked"):',$(this).find("input[type=checkbox]").prop("checked"))
        if ($(this).find("input[type=checkbox]").prop("checked")) {
            $(this).find("label").text('OFF');
//            $(this).find("input[type=checkbox]").trigger('click');
              $(this).find("input[type=checkbox]").prop("checked",false);
            notifications_enabled = false;
            
            await window.electron.ipcRenderer_invoke("set_notifications_enabled", false);
            await window.electron.ipcRenderer_invoke("save_wallet", null);
                     
        } else {
            $(this).find("label").text('ON');
//            $(this).find("input[type=checkbox]").trigger('click');
               $(this).find("input[type=checkbox]").prop("checked",true);
            notifications_enabled = true;
            
            
            new Notification("ALiWa Wallet", {
                icon: 'view_resources/img/aliwa_light.png',
                body: "Notifications enabled"
            });
                    
            await window.electron.ipcRenderer_invoke("set_notifications_enabled", true);
            await window.electron.ipcRenderer_invoke("save_wallet", null);
            
            
        }            
    });
    
     $("#settings_custom_server").off("click").on("click",function(){
            view_settings_custom_server();
        });
        
      $("#settings_about").off("click").on("click",function(){
            view_about();
        });  
     
    
}

function view_native_currency(){
    window.scrollTo(0, 0);
    var j_load=$(build_from_key("native_currency"));
    
    //manipulate

    $("body").html(j_load).hide().fadeIn(250,"easeInOutQuad"); 
    $("#navbar_title").text("Native Currency");
//    $("#view_settings_menu").hide().show("slide", { direction: "down" }, 100,"easeInOutQuad");
    $("#view_settings_native_currency_menu_slider_place").animate({height:"-=30vh"},500,"easeOutQuint",function(){
        $("#view_settings_native_currency_menu_slider_place").hide();
    });
          
    $("#view_back_overview").off("click").on("click",function(){
         view_overview();
     });
     $("#view_back_current").off("click").on("click",function(){
         view_settings();
     });
     
     //select currency  
     $(".currency_item_select").off("click").on("click",async function(){
         show_popup_action(templ_loads,"info",$(this).find("span").first().text()+" selected");
         await window.electron.ipcRenderer_invoke("set_selected_currency",$(this).find("span").first().text());
         selected_currency=$(this).find("span").first().text();
         window.electron.ipcRenderer_invoke("save_wallet",null);
//         view_settings()();
     });
     
     
}

async function view_settings_custom_server(){
    window.scrollTo(0, 0);
    var j_load=$(build_from_key("custom_server"));
    
    //list server addresses
    var addresses=await window.electron.ipcRenderer_invoke("list_server_aliwa_addresses");
   
    var community=addresses.community;
    var custom=addresses.custom;
    var current_server_label=addresses.current_selected;
    
    var community_html="";
    var custom_html="";
    
    var view_settings_custom_server_site_state="list";
    
    for(var i=0;i<community.length;i++){
      community_html+='<a  id="community_server_address_'+community[i].label+'" class="teal item aliwa_community_server_address_item">'
        +'<span style="display: inline-block">'+community[i].label+'</span>'
        +'<i class="inverted white info circle right icon Medium"></i>'  
        +'<span id="settings_native_currency_value" style="float:right"></span>'
        +'</a>'; 
    }
    
    for(var i=0;i<custom.length;i++){
        custom_html+='<a  id="custom_server_address_'+custom[i].label+'" class="teal item aliwa_custom_server_address_item">'
        +'<span style="display: inline-block">'+custom[i].label+'</span>'
        +'<i class="inverted white info circle right icon Medium"></i>'  
        +'<span id="settings_native_currency_value" style="float:right"></span>'
        +'</a>';
    }
     

    $("body").html(j_load).hide().fadeIn(250,"easeInOutQuad"); 
    
    $(community_html).insertAfter("#view_settings_custom_server_community_header");
    $(custom_html).insertAfter("#view_settings_custom_server_custom_header");
    
    
    $("#navbar_title").text("Custom Server");
//    $("#view_settings_menu").hide().show("slide", { direction: "down" }, 100,"easeInOutQuad");
    $("#view_settings_custom_server_menu_slider_place").animate({height:"-=30vh"},500,"easeOutQuint",function(){
        $("#view_settings_custom_server_menu_slider_place").hide();
    });
          
    $("#view_back_overview").off("click").on("click",function(){
         view_overview();
     });
     $("#view_back_current").off("click").on("click",function(){
         view_settings();
     });
     
     $("#view_settings_custom_server_list").off("click").on("click",function(){
        $(".aliwa_community_server_address_item,.aliwa_custom_server_address_item").find("i").removeClass("info").removeClass("circle").removeClass("times").removeClass("edit").removeClass("check").addClass("circle").addClass("info"); 
        $(this).find("i").removeClass("check");
        $(".aliwa_community_server_address_item,.aliwa_custom_server_address_item").each(function(){
         var cur_label=$(this).find("span").first().text();        
         if(current_server_label==cur_label){         
            $(this).find("i").removeClass("info").removeClass("circle").removeClass("times").removeClass("edit").removeClass("check").addClass("check"); 
         }
        });
        
        view_settings_custom_server_site_state="list";
        
        $([document.documentElement, document.body]).animate({
        scrollTop: $("#view_settings_custom_server_custom_header").offset().top
        }, 1000);
        
     });
     
     $("#view_settings_custom_server_edit").off("click").on("click",function(){
        $(".aliwa_custom_server_address_item").find("i").removeClass("info").removeClass("circle").removeClass("times").removeClass("edit").removeClass("check").addClass("edit"); 
        
        $(".aliwa_community_server_address_item,.aliwa_custom_server_address_item").each(function(){
         var cur_label=$(this).find("span").first().text(); 
         $(this).find("i").removeClass("check");
         if(current_server_label==cur_label){         
            $(this).find("i").removeClass("info").removeClass("circle").removeClass("times").removeClass("edit").removeClass("check").addClass("check"); 
         }
         });
         
        view_settings_custom_server_site_state="edit";
        $([document.documentElement, document.body]).animate({
        scrollTop: $("#view_settings_custom_server_custom_header").offset().top
        }, 1000);
     });
     
     $("#view_settings_custom_server_delete").off("click").on("click",function(){
        $(".aliwa_custom_server_address_item").find("i").removeClass("info").removeClass("circle").removeClass("times").removeClass("edit").removeClass("check").addClass("times");
        
        $(".aliwa_community_server_address_item,.aliwa_custom_server_address_item").each(function(){
         var cur_label=$(this).find("span").first().text(); 
          $(this).find("i").removeClass("check");
         if(current_server_label==cur_label){         
            $(this).find("i").removeClass("info").removeClass("circle").removeClass("times").removeClass("edit").removeClass("check").addClass("check"); 
         }
        });
        
         view_settings_custom_server_site_state="delete";
         $([document.documentElement, document.body]).animate({
         scrollTop: $("#view_settings_custom_server_custom_header").offset().top
         }, 1000);
     });
     
     
     $(".aliwa_community_server_address_item,.aliwa_custom_server_address_item").each(function(){
         var cur_label=$(this).find("span").first().text();        
         if(current_server_label==cur_label){         
            $(this).find("i").removeClass("info").removeClass("circle").removeClass("times").removeClass("edit").removeClass("check").addClass("check"); 
         }
     });
     
     $(".aliwa_community_server_address_item,.aliwa_custom_server_address_item").off("click").on("click", function () { 
         var cur_label=$(this).find("span").first().text();  
         var cur_address=null;
         for(var i=0;i<community.length;i++){
             if(cur_label==community[i].label){
                 cur_address=community[i].address;
             }
         }
         for(var i=0;i<custom.length;i++){
             if(cur_label==custom[i].label){
                 cur_address=custom[i].address;
             }
         }
                          
         if(view_settings_custom_server_site_state=="list" || $(this).hasClass("aliwa_community_server_address_item")){
         
            show_dialogue_modal(templ_loads,"Select Light Server",
                        '<span>Do you want to select this server?<br><br> '
                        +'<b>'+cur_label+'</b>:<br>'
                        +cur_address+'</span>'
                        ,"SELECT SERVER","Abort",addresses
                        ,async function(){ 
                            $('.ui.modal').modal("hide"); 
                            setTimeout(function(){
                                show_dialogue_modal(templ_loads,"Complete Resync?",
                                '<span>A complete resync will clean out all transactions and sync from block 0.<br><br>\n\
                                This can be helpful if - for whatever reason - you have wrong transactions. Such txs could be caused for example by a malcious light server,orphan blocks or endless unconfirmed transactions not correctly removed.<br><br>'
                                +'Even with thousands of transactions on hundreds of addresses this will take just a few seconds.'                              
                                ,"COMPLETE RESYNC","JUST SWITCH TO SERVER",addresses
                                ,async function(){ 
                                     await window.electron.ipcRenderer_invoke("switch_to_aliwa_server_address",cur_label,true);
                                     view_settings_custom_server();
                                     clean_modal("modal");
                                     setTimeout(function () { show_popup_action(templ_loads, "info", ('Server setted to:<br>"'+cur_label+'"'),3000); }, 300);
                                },async function(){
                                    await window.electron.ipcRenderer_invoke("switch_to_aliwa_server_address",cur_label,false);  
                                    view_settings_custom_server();
                                    clean_modal("modal");
                                    setTimeout(function () {show_popup_action(templ_loads, "info", ('Server setted to:<br>"'+cur_label+'"'),3000); }, 300);
                                 });
                            },300);   
                                                                             
                        },function(){});
        }//list
        
        if(view_settings_custom_server_site_state=="edit" && $(this).hasClass("aliwa_custom_server_address_item")){
                    
            if(current_server_label==cur_label){
            show_dialogue_info(templ_loads,"Server is selected","This server can not be altered, because it is selected.<br>\n\
            Select a different server first before you change this one.","OK",function(){});
            return;
            }
            
            show_dialogue_input(templ_loads, "Edit Server", "Enter a label and a server address.<br>", "Address", "text", "Edit Server Server", "Abort", "data", async function () {
            var address = $("#dialogues_input_input").val();
                 
            var can_add = await window.electron.ipcRenderer_invoke("edit_aliwa_server_address",cur_label,address);            
            if (can_add == true) {
                show_popup_action(templ_loads, "info", "Server address edited");               
                $('.ui.modal').modal("hide"); 
                setTimeout(function(){view_settings_custom_server();},300);
            } else {
                $("#dialogues_input_yes").transition('shake');
                show_popup_action(templ_loads, "error", "Unknown error!");
            }
            }, async function () {});
        }
        
        if(view_settings_custom_server_site_state=="delete" && $(this).hasClass("aliwa_custom_server_address_item")){          
            if(current_server_label==cur_label){
            show_dialogue_info(templ_loads,"Server is selected","This server can not be altered, because it is selected.<br>\n\
            Select a different server first before you change this one.","OK",function(){});
            return;
            }
                       
            show_dialogue_modal(templ_loads,"Delete Server?",                               
                                '<span><b>If you delete the server you are using you will be connected to the defaul server!</b><br><br>'
                                +'Do you really want to delete this server?<br><br> '
                                +'<b>'+cur_label+'</b>:<br>'
                               +cur_address+'</span>'
                                ,"DELETE SERVER","Abort",addresses
                                ,async function(){ 
                                     await window.electron.ipcRenderer_invoke("delete_aliwa_server_address",cur_label);
                                     $('.ui.modal').modal("hide"); 
                                     setTimeout(function(){
                                       view_settings_custom_server();                                     
                                     },300);
                                                                                                          
                                },async function(){});
//                                show selected -> mark it
//                                restrict current used server for edit and delete
        }
     });
     
       
     $("#view_settings_custom_server_add").off("click").on("click", function () {
        show_dialogue_input(templ_loads, "Add Custom Server", "Enter a label and a server address.<br>", "Label", "text", "Add Custom Server", "Abort", "data", async function () {
            var label = $("#dialogues_input_input").val();
            var address = $("#dialogues_input_input2").val();
        
            var can_add = await window.electron.ipcRenderer_invoke("add_aliwa_server_address",label,address,"custom");            
            if (can_add == true) {
                show_popup_action(templ_loads, "info", "Server address added");               
                $('.ui.modal').modal("hide"); 
                setTimeout(function(){view_settings_custom_server();},300);
            } else {
                $("#dialogues_input_yes").transition('shake');
                show_popup_action(templ_loads, "error", "Label is duplicated!");
            }

        }, async function () {}, [{input_name: "address", input_type: "text"}]);
    });
    
    
     
     
}


function view_settings_custom_server_edit(){}

function view_settings_custom_server_delete(){}

async function tab_to_transactions(){
    //set tab
    $('#tab_second').off("click");
    
    $("#tab_second").removeClass("active");
    $("#tab_first").removeClass("active");
    $("#tab_second").addClass("active");
    
   
    var table_html=await transactions_pagination();     
         
//     j_load.find("#view_address_book_receive_table_body").html(table_list);
     
     //transition
     $('#overview_segment').transition('slide right',50,function(){
          $('#overview_segment').html(table_html);        
          transactions_pagination_actions();
          
          
     },"easeInOutQuad").transition('slide left',100,"easeInOutQuad");
     
      $('#tab_first').off("click").on('click',function(){
          tab_to_overview();
      });
      
      
         
}

async function transactions_pagination(){  
    var j_load=$(templ_loads["transactions"]);
     //manipulate
     var j_clone=j_load.clone();
     var list=await window.electron.ipcRenderer_invoke("list_transactions",transaction_table_sorting.page,transaction_table_sorting.field,transaction_table_sorting.descending,transaction_table_sorting.search);
//    console.log(list);
    var sync_height=list.sync_height;  
    var result=list.result;
    var table_list="";
    
    //get address labels
    var address_list=[];
    for(var i=0;i<result.length;i++){
        address_list.push(result[i].address);
    }
    var label_list = await window.electron.ipcRenderer_invoke("get_address_labels",address_list);
//    console.log(label_list)
    
    for(var i=0;i<result.length;i++){
        var tx=result[i].tx;
        var confirmations=sync_height-result[i].height+1;
        var date=result[i].human_time;//result[i].height       
        var value=result[i].value;
             
        var mature=result[i].mature;             
        var type=result[i].type;
        if(mature==0){type="staked";}
        
        var address=result[i].address;
        var note=result[i].note;
        
        var confirm_symbol="question";
        if(mature==1){
            if(confirmations>0){confirm_symbol="clock outline";}
            if(confirmations>3){confirm_symbol="clock";}
            if(confirmations>5){confirm_symbol="check circle";}
        }
        
        if(mature==0){
            if(confirmations>0){confirm_symbol="clock outline";}
            if(confirmations>300){confirm_symbol="clock";}
            if(confirmations>449){confirm_symbol="check circle";}
        }
        
       
        var line=j_load.find("#view_transactions_table_body tr:nth-child(1)").clone();
//        console.log(line.find("td:nth-child(1)").html());
        
        line.find("td:nth-child(1) h4 i").removeClass("question").addClass(confirm_symbol);
        line.find("td:nth-child(1) h4 div span").text(""+confirmations<1 ? "" : confirmations);
        line.find("td:nth-child(1) h4 div div").text(""+(confirmations>0 ? (confirmations>1 ? "Confirmations" : "Confirmation") : "Unknown"));
        
               
        line.find("td:nth-child(2) ").html('<i class="ui '+confirm_symbol+' icon large desktop_hide"></i>'+date);
        
        //value
        if(value>0){
            line.find("td:nth-child(3) span").removeClass("red").addClass("green");
        }
        line.find("td:nth-child(3) span").text(value).css("font-size","1.2rem");
        
        line.find("td:nth-child(4) ").text(""+type);
        line.find("td:nth-child(5) ").html('<div style="display:none;" value="'+address+'"></div>'+((label_list[i]==null || label_list[i]=="") ? address : label_list[i]));
        line.find("td:nth-child(6) ").text(""+(note!=undefined ? note : ""));
        
        table_list+='<tr id="tx_'+tx+'">'+line.html()+"</tr>";
        
    }
    j_clone.find("#view_transactions_table_body").html(table_list);
    
    //pagination
    var page=list.page;
    var page_max=list.page_max-1;
    if(page<1){j_clone.find("#view_transactions_pagination_container_left_arrow").addClass("disabled");}
    if(page>=page_max){j_clone.find("#view_transactions_pagination_container_right_arrow").addClass("disabled");}
    
    if(page==0){j_clone.find("#view_transactions_pagination_container_page_first").hide();}
    else{j_clone.find("#view_transactions_pagination_container_page_first").text(1);}
    
       
    if(page<2){j_clone.find("#view_transactions_pagination_container_page_second").hide();}
    if(page-1==1){j_clone.find("#view_transactions_pagination_container_page_second").text(2);}
    
    
    
    j_clone.find("#view_transactions_pagination_container_page_third").text((page+1));
    if(page+1>=page_max && page+2!=page_max){j_clone.find("#view_transactions_pagination_container_page_fourth").hide();}
    if(page+1==page_max-1){j_clone.find("#view_transactions_pagination_container_page_fourth").text(page+2)}
    
    j_clone.find("#view_transactions_pagination_container_page_fifth").text(page_max+1)
    if(page>=page_max){ j_clone.find("#view_transactions_pagination_container_page_fifth").hide();}
    
    
    return j_clone;
}

async function transactions_pagination_actions(){ 
    if(transaction_table_sorting.search!=null && typeof(transaction_table_sorting.search) == "string"){      
        $("#view_transactions_input_search").val(transaction_table_sorting.search);       
    }
    
    //pagination actions
          $("#view_transactions_table_body tr").off("click").on("click",async function(){
                var tx=$(this).prop("id").split("_")[1];
                var confirmations=$(this).find("td:nth-child(1) h4 div span").text();
              
                var full_tx=await window.electron.ipcRenderer_invoke("get_single_transaction",tx);
                console.log(full_tx);               
                show_dialogue_info(templ_loads,"Details","","OK",function(){},f => view_single_transaction_in_dialogue(tx,full_tx,confirmations));
          });
          
          $("#view_transactions_pagination_container_left_arrow").off("click").on("click",async function(){
                var cur_num=parseInt($("#view_transactions_pagination_container_page_third").text());
                transaction_table_sorting.page=cur_num-2;
                var j_clone=await transactions_pagination();
                $('#overview_segment').html(j_clone);
                transactions_pagination_actions();
          });
          
          $("#view_transactions_pagination_container_right_arrow").off("click").on("click",async function(){
                var cur_num=parseInt($("#view_transactions_pagination_container_page_third").text());
                transaction_table_sorting.page=cur_num;
                var j_clone=await transactions_pagination();
                 $('#overview_segment').html(j_clone);
                 transactions_pagination_actions();
          });
          
          $(".tx_pagination_item_num").off("click").on("click",async function(){
              if(!isNaN(parseInt($(this).text()))){
                transaction_table_sorting.page=parseInt($(this).text())-1;  
                var j_clone=await transactions_pagination();                
                $('#overview_segment').html(j_clone);             
                transactions_pagination_actions();
              }
            
          });
          
          input_clear_button_func("#transactions_pagination_goto_input","#transactions_pagination_goto_input_clear");
          
          $("#transactions_pagination_goto_button").off("click").on("click",async function(){
//              var max=parseInt($("#view_transactions_pagination_container_page_fifth").text()-1);
                var page=parseInt($("#transactions_pagination_goto_input").val())-1;
                if(page>=0 && page <= parseInt($("#view_transactions_pagination_container_page_fifth").text())-1){
                    transaction_table_sorting.page=page;
                    var j_clone=await transactions_pagination();
                    $('#overview_segment').html(j_clone);
                    transactions_pagination_actions();
                }
          });
          
          
          //search
          input_clear_button_func("#view_transactions_input_search","#view_transactions_input_search_clear");
          $("#view_transactions_input_search").off("change").on("change",function(){
              if(transaction_table_sorting.search==$("#view_transactions_input_search").val()){return;}
              transactions_last_search_time=(new Date().getTime());  
              transaction_table_sorting.search=$("#view_transactions_input_search").val();
              
              if((transaction_table_sorting.search!=null && typeof(transaction_table_sorting.search) == "string") || $("#view_transactions_input_search").val()==""){               
              setTimeout(async function(){               
               if(new Date().getTime()-transactions_last_search_time > 400){
                 
                    console.log("SEARCH TRIGGERED with page: "+transaction_table_sorting.page+" | " +transaction_table_sorting.search);
                 transactions_last_search_time=(new Date().getTime()); 
//                 transaction_table_sorting.search=$("#view_transactions_input_search").val();
                 transaction_table_sorting.page=0;             
                 var j_clone=await transactions_pagination();
                 $('table').html(j_clone.find("table"));              
//                 $("#view_transactions_input_search").focus();
                 transactions_pagination_actions();             
               }   
              },500);
                  
              }
          });
          
          //sorting
          $("#view_transactions_header").find("i").remove("i"); //remove all carets
          switch (transaction_table_sorting.field){
              case "height":if(transaction_table_sorting.descending){$("#view_transactions_header_confirmations").append('<i class="caret up icon"></i>');}
                            else{$("#view_transactions_header_confirmations").append('<i class="caret down icon"></i>');}break;
              case "time":if(transaction_table_sorting.descending){$("#view_transactions_header_date").append('<i class="caret down icon"></i>');}
                            else{$("#view_transactions_header_date").append('<i class="caret up icon"></i>');}break;              
              case "value":if(transaction_table_sorting.descending){$("#view_transactions_header_value").append('<i class="caret down icon"></i>');}
                            else{$("#view_transactions_header_value").append('<i class="caret up icon"></i>');}break;
              case "type":if(transaction_table_sorting.descending){$("#view_transactions_header_type").append('<i class="caret down icon"></i>');}
                            else{$("#view_transactions_header_type").append('<i class="caret up icon"></i>');}break;
              case "address":if(transaction_table_sorting.descending){$("#view_transactions_header_address").append('<i class="caret down icon"></i>');}
                            else{$("#view_transactions_header_address").append('<i class="caret up icon"></i>');}break;
              case "note":if(transaction_table_sorting.descending){$("#view_transactions_header_note").append('<i class="caret down icon"></i>');}
                            else{$("#view_transactions_header_note").append('<i class="caret up icon"></i>');}break;              
          }
          
          
          $("#view_transactions_header_confirmations").off("click").on("click",async function(){          
            if($(this).find("i").hasClass("down")){
                transaction_table_sorting.page=0;
                transaction_table_sorting.field="height";
                transaction_table_sorting.descending=true;
                var j_clone=await transactions_pagination();
                $('#overview_segment').html(j_clone);
                transactions_pagination_actions();                             
            }
            else{
                transaction_table_sorting.page=0;
                transaction_table_sorting.field="height";
                transaction_table_sorting.descending=false;
                var j_clone=await transactions_pagination();
                $('#overview_segment').html(j_clone);
                transactions_pagination_actions();   
            }
          });
                                    
          $("#view_transactions_header_date").off("click").on("click",async function(){          
            if($(this).find("i").hasClass("up")){
                transaction_table_sorting.page=0;
                transaction_table_sorting.field="time";
                transaction_table_sorting.descending=true;
                var j_clone=await transactions_pagination();
                $('#overview_segment').html(j_clone);
                transactions_pagination_actions();                             
            }
            else{
                transaction_table_sorting.page=0;
                transaction_table_sorting.field="time";
                transaction_table_sorting.descending=false;
                var j_clone=await transactions_pagination();
                $('#overview_segment').html(j_clone);
                transactions_pagination_actions();   
            }
          });
          
           $("#view_transactions_header_value").off("click").on("click",async function(){          
            if($(this).find("i").hasClass("up")){
                transaction_table_sorting.page=0;
                transaction_table_sorting.field="value";
                transaction_table_sorting.descending=true;
                var j_clone=await transactions_pagination();
                $('#overview_segment').html(j_clone);
                transactions_pagination_actions();                             
            }
            else{
                transaction_table_sorting.page=0;
                transaction_table_sorting.field="value";
                transaction_table_sorting.descending=false;
                var j_clone=await transactions_pagination();
                $('#overview_segment').html(j_clone);
                transactions_pagination_actions();   
            }
          });
          
          $("#view_transactions_header_type").off("click").on("click",async function(){          
            if($(this).find("i").hasClass("up")){
                transaction_table_sorting.page=0;
                transaction_table_sorting.field="type";
                transaction_table_sorting.descending=true;
                var j_clone=await transactions_pagination();
                $('#overview_segment').html(j_clone);
                transactions_pagination_actions();                             
            }
            else{
                transaction_table_sorting.page=0;
                transaction_table_sorting.field="type";
                transaction_table_sorting.descending=false;
                var j_clone=await transactions_pagination();
                $('#overview_segment').html(j_clone);
                transactions_pagination_actions();   
            }
          });
          
          $("#view_transactions_header_address").off("click").on("click",async function(){          
            if($(this).find("i").hasClass("up")){
                transaction_table_sorting.page=0;
                transaction_table_sorting.field="address";
                transaction_table_sorting.descending=true;
                var j_clone=await transactions_pagination();
                $('#overview_segment').html(j_clone);
                transactions_pagination_actions();                             
            }
            else{
                transaction_table_sorting.page=0;
                transaction_table_sorting.field="address";
                transaction_table_sorting.descending=false;
                var j_clone=await transactions_pagination();
                $('#overview_segment').html(j_clone);
                transactions_pagination_actions();   
            }
          });
          
          $("#view_transactions_header_note").off("click").on("click",async function(){          
            if($(this).find("i").hasClass("up")){
                transaction_table_sorting.page=0;
                transaction_table_sorting.field="note";
                transaction_table_sorting.descending=true;
                var j_clone=await transactions_pagination();
                $('#overview_segment').html(j_clone);
                transactions_pagination_actions();                             
            }
            else{
                transaction_table_sorting.page=0;
                transaction_table_sorting.field="note";
                transaction_table_sorting.descending=false;
                var j_clone=await transactions_pagination();
                $('#overview_segment').html(j_clone);
                transactions_pagination_actions();   
            }
          });
          
                    
}


function view_single_transaction_in_dialogue(tx,full_tx,confirmations) {
    //setTimeout(function () {
        var dialogue = $(templ_loads["dialogues"]).filter("#single_transaction_dialogue");
        $("#dialogues_info_description").append(dialogue);
        $("#dialogues_info_description").css({"overflow-y":"auto","max-height": "65vh"});
                   
     
        
        //tx
        $("#single_transaction_dialogue_tx_link a").attr("href", 'https://chainz.cryptoid.info/alias/tx.dws?' + tx + '.htm');
        $("#single_transaction_dialogue_tx_link a").text(tx);

        $("#single_transaction_dialogue_tx_link").off("click").on("click", function () {
            var button_top_pos = $("#single_transaction_dialogue_tx_link").position().top;
            button_top_pos -= $("#single_transaction_dialogue_tx_popup").height();
            $("#single_transaction_dialogue_tx_popup").css({position: "fixed", width: "90%", top: (button_top_pos - 10)});
            $("#single_transaction_dialogue_tx_popup").toggle();
            
            $("#single_transaction_dialogue_popup_tx_confirm").off("click").on("click", async function () {
                await window.electron.ipcRenderer_invoke("open_tx_link", $("#single_transaction_dialogue_tx_link a").attr("href"));
            });
                       
        });
        
        //blockhash
        $("#single_transaction_dialogue_blockhash_link a").attr("href", 'https://chainz.cryptoid.info/alias/block.dws?' + full_tx.blockhash + '.htm');
        $("#single_transaction_dialogue_blockhash_link a").text(full_tx.blockhash);

        $("#single_transaction_dialogue_blockhash_link").off("click").on("click", function () {
            if(full_tx.blockhash==null){return;}
            var button_top_pos = $("#single_transaction_dialogue_blockhash_link").position().top;
            button_top_pos -= $("#single_transaction_dialogue_blockhash_popup").height();
            $("#single_transaction_dialogue_blockhash_popup").css({position: "fixed", width: "90%", top: (button_top_pos - 10)});
            $("#single_transaction_dialogue_blockhash_popup").toggle();
            
            $("#single_transaction_dialogue_popup_blockhash_confirm").off("click").on("click", async function () {
                await window.electron.ipcRenderer_invoke("open_tx_link", $("#single_transaction_dialogue_blockhash_link a").attr("href"));
            });
                       
        });
        
        //status date fee amount
        $("#single_transaction_dialogue_status").html(confirmations+"&nbsp;"+(confirmations<450 && full_tx.mature==0 && confirmations>0 ? "of 450&nbsp;" : (confirmations<6 && full_tx.mature==1 && confirmations>0 ? "of 6&nbsp;" : ""))
                +(confirmations>1 || confirmations=="" ? (confirmations=="" ? "Unknown" : "confirmations") : "confirmation"));      
        $("#single_transaction_dialogue_date").html((new Date(numeral(full_tx.time).multiply(1000).value()).toLocaleString()));
        if(full_tx.fee!=undefined){
        $("#single_transaction_dialogue_fee").html(numeral(full_tx.fee).format("0.00[000000]"));}
        else{$("#single_transaction_dialogue_fee").html("Unknown");}
    
        $("#single_transaction_dialogue_amount").html(numeral(full_tx.self_balance).format("0.00[000000]"));
        if(full_tx.self_balance<0){
          $("#single_transaction_dialogue_amount").css("color","#ff695e");  
        }
        else{
            $("#single_transaction_dialogue_amount").css("color","#2ecc40");
            $("#single_transaction_dialogue_amount").html("+"+numeral(full_tx.self_balance).format("0.00[000000]"));
        }
        
        for(var i=0;i<full_tx.destinations.length;i++){
            if((!full_tx.destinations[i].self && full_tx.self_balance<0) || (full_tx.destinations[i].self && full_tx.self_balance>=0)){
                $("#single_transaction_dialogue_destinations").append('<div><b>'+(full_tx.self_balance<0 ? "Debit:&nbsp;-" : "Credit:&nbsp;")+'</b>'+numeral(full_tx.destinations[i].value).format("0.00[000000]")+'</div>');               
                $("#single_transaction_dialogue_destinations").append('<div class="" style="color:#f38320;text-align:left;">'
                        +'<button class="ui icon button medium single_transaction_dialogue_destinations_edit_address" style="background:none;padding:0"><i class="edit icon" value="'+full_tx.destinations[i].address+'"></i></button>&nbsp;'
                        +'<span style="max-width:80%;overflow:hidden;text-overflow:ellipsis;display:inline-block;" value="'+i+'">'+((full_tx.destinations[i].label!=null && full_tx.destinations[i].label!="") ? full_tx.destinations[i].label : full_tx.destinations[i].address)+"&nbsp;</span>"
                        +'<button class="ui icon button medium single_transaction_dialogue_destinations_copy_address" style="background:none;padding:0"><i class="copy icon" value="'+full_tx.destinations[i].address+'"></i></button>'                    
                        +'</div>');
                if(full_tx.destinations[i].note!=null){
                    $("#single_transaction_dialogue_destinations").append('<div><i>'+full_tx.destinations[i].note+'</i></div><br>'); 
                }
                else{$("#single_transaction_dialogue_destinations").append("<br>");}
            }
        }
        
        $(".single_transaction_dialogue_destinations_copy_address").off("click").on("click", function () {
            var clip_text=$(this).find("i").attr("value");                  
           navigator.clipboard.writeText(clip_text);
           show_popup_action(templ_loads,"info","Address copied");
        });
        
        edit_label_on_single_transaction(full_tx);
//           $("#dialogues_info_description").append('<div style="margin-top:1rem;">'+JSON.stringify(full_tx,null,2)+'</div>');


  //  }, 25);
}

function edit_label_on_single_transaction(full_tx){
    
//    duplicated
//    duplicated label
    
    $(".single_transaction_dialogue_destinations_edit_address").off("click").on("click", function () {
            var i=parseInt($(this).parent().find("span").attr("value"));     
            var edit_start_value=(full_tx.destinations[i].label!=null ? full_tx.destinations[i].label : full_tx.destinations[i].address);
           
                         
            $(this).parent().find("span")
            .replaceWith('<input id="" type="text" value="'+(full_tx.destinations[i].label!=null ? full_tx.destinations[i].label : full_tx.destinations[i].address)+'" class="aliwa_input_field_white" style="width:80%;">');
           
            $(this).find("i").removeClass("edit").addClass("check");
            $(this).parent().find("input").focus().select();
            $(this).removeClass("single_transaction_dialogue_destinations_edit_address").addClass("single_transaction_dialogue_destinations_edit_address_confirm");
            
            $(".single_transaction_dialogue_destinations_edit_address_confirm").off("click").on("click", async function () {
               
                var new_label=$(this).parent().find("input").val();
                if(new_label==edit_start_value){
                    $(this).parent().find("input")
                    .replaceWith('<span style="max-width:80%;overflow:hidden;text-overflow:ellipsis;display:inline-block;" value="'+i+'">'+((full_tx.destinations[i].label!=null && full_tx.destinations[i].label!="") ? full_tx.destinations[i].label : full_tx.destinations[i].address)+"&nbsp;</span>");
                    $(this).find("i").removeClass("check").addClass("edit");
                    $(this).removeClass("single_transaction_dialogue_destinations_edit_address_confirm").addClass("single_transaction_dialogue_destinations_edit_address");
                     edit_label_on_single_transaction(full_tx);
                    return;
                }
                var res= await window.electron.ipcRenderer_invoke("set_address_label_contact_or_receive",full_tx.destinations[i].address,new_label);
                if(res==false){
                    show_popup_action(templ_loads,"error","Basic Contacts are immutable!");
                    $(this).parent().find("input")
                    .replaceWith('<span style="max-width:80%;overflow:hidden;text-overflow:ellipsis;display:inline-block;" value="'+i+'">'+((full_tx.destinations[i].label!=null && full_tx.destinations[i].label!="") ? full_tx.destinations[i].label : full_tx.destinations[i].address)+"&nbsp;</span>");
                    $(this).find("i").removeClass("check").addClass("edit");
                    $(this).removeClass("single_transaction_dialogue_destinations_edit_address_confirm").addClass("single_transaction_dialogue_destinations_edit_address");
                                                                     
                    edit_label_on_single_transaction(full_tx);                            
                }
                else if(res=="duplicated" || res=="duplicated label"){show_popup_action(templ_loads,"error","Label is duplicated!");} 
                else{
                     full_tx=await window.electron.ipcRenderer_invoke("get_single_transaction",full_tx.tx);  
                    window.electron.ipcRenderer_invoke("save_wallet",null);
                    
                    //update transactions
                    var cur_num=parseInt($("#view_transactions_pagination_container_page_third").text());
                    transaction_table_sorting.page=cur_num-1;
                    var j_clone=await transactions_pagination();
                    $('#view_transactions_table_body').html(j_clone.find("#view_transactions_table_body").html());
                    transactions_pagination_actions();
                    
                    
                    $(this).parent().find("input")
                    .replaceWith('<span style="max-width:80%;overflow:hidden;text-overflow:ellipsis;display:inline-block;" value="'+i+'">'+((full_tx.destinations[i].label!=null && full_tx.destinations[i].label!="") ? full_tx.destinations[i].label : full_tx.destinations[i].address)+"&nbsp;</span>");
                    $(this).find("i").removeClass("check").addClass("edit");
                    $(this).removeClass("single_transaction_dialogue_destinations_edit_address_confirm").addClass("single_transaction_dialogue_destinations_edit_address");
                                                   
                   
                    edit_label_on_single_transaction(full_tx);
                }
                
            });
            
        });
}

function tab_to_overview(){
    //set tab
    $('#tab_first').off("click");
    
    $("#tab_second").removeClass("active");
    $("#tab_first").removeClass("active");
    $("#tab_first").addClass("active");
    
    
     var j_load=$(templ_loads["message"]);
     var j_load_2=$(templ_loads["overview"]).contents().unwrap();
     j_load=j_load.add(j_load_2);
     //manipulate
//     j_load.find("#test_confirm").text("infinite");
     
     //transition
     $('#overview_segment').transition('slide left',50,function(){
          $('#overview_segment').html(j_load); 
          actions_overview(); 
     },"easeInOutQuad").transition('slide right',100,"easeInOutQuad");
     
         
}

function view_transactions(){
     //transactions
}


async function view_set_password(startup=false,seed_words){
    window.scrollTo(0, 0);
    if(startup){       
         $("body").html(templ_loads["set_password"]+"</div>").hide();
         $("body").fadeIn(100,"easeInOutQuad");
         $("#view_set_password_input_OldPassword_fluid,#view_set_password_input_OldPassword_label").hide();
         
         var insert_text='<div class="ui info icon message huge">'
                    + '<i class="lock icon"></i>'                  
                    + 'By setting a password your wallet will be aes256-encrypted. It can then only be opened and used with your password.'                 
                    + '</div>';
        
        $(insert_text).insertBefore("#view_set_password_input_OldPassword_label");
        $(".segment").css("margin-top","0rem");
        
        $("#view_set_password_input_NewPassword_label").text("Password");
        $("#view_set_password_input_NewPassword").prop("placeholder","Password");
        
        $("#view_set_password_input_ConfirmNewPassword_label").text("Confirm Password");       
        $("#view_set_password_input_ConfirmNewPassword").prop("placeholder","Confirm Password");
         
    }
    else{
        $("body").html(build_from_key("set_password")).hide();
    var has_no_password=await window.electron.ipcRenderer_invoke("compare_password","");
    var has_backup=await window.electron.ipcRenderer_invoke("has_backup");
    
    //manipulate
    $("#navbar_title").text("Set Password");
    
    //...
    
    $("body").fadeIn(100,"easeInOutQuad");
    
      $("#view_back_overview").off("click").on("click",function(){
         view_overview();
     });
     $("#view_back_current").off("click").on("click",function(){
         view_settings();
     });
     
     if(has_no_password){
        $("#view_set_password_input_OldPassword_fluid,#view_set_password_input_OldPassword_label").hide();
        var insert_text='<div class="ui warning icon message huge">'
                    + '<i class="lock icon"></i>'
                    + 'Your wallet is not encrypted! <br>'
                    + 'By setting a password your wallet will be aes256-encrypted. It can then only be opened and used with your password.'                 
                    + '</div>';
        
        if (!has_backup) {
            insert_text += '<div class="ui warning message huge">'
                    + ' <i class="close icon"></i>'
                    + '<div class="header">'
                    + ' You have no backup!'
                    + '</div>'
                    + ' If you can\'t remember your password you will lose all your funds without a backup!<br>'
                    + 'Please backup your wallet first!'
                    + '<div style="margin: auto;text-align: center;">'
                    +'<button id="view_set_password_button_backup" class="ui icon button alias_orange_button2 massive" style="margin-top:1.5rem;width:20rem">'
                    +'    Backup Wallet '
                    +'</button>'
                    +'</div>'
                    + '</div>';
        }
        
        $(insert_text).insertBefore("#view_set_password_input_OldPassword_label");
        
        $('.message .close')
        .on('click', function() {
            $(this).closest('.message').transition('fade');});    

        $("#view_set_password_button_backup").off("click").on("click",function(){
            view_backup();
        });
        
        $("#view_set_password_input_NewPassword_label").text("Password");
        $("#view_set_password_input_NewPassword").prop("placeholder","Password");
        
         $("#view_set_password_input_ConfirmNewPassword_label").text("Confirm Password");       
        $("#view_set_password_input_ConfirmNewPassword").prop("placeholder","Confirm Password");
     }
         
    }
    
    //clearings
     input_clear_button_func("#view_set_password_input_OldPassword","#view_set_password_input_OldPassword_clear");
     input_clear_button_func("#view_set_password_input_NewPassword","#view_set_password_input_NewPassword_clear");
     input_clear_button_func("#view_set_password_input_ConfirmNewPassword","#view_set_password_input_ConfirmNewPassword_clear");
     
     $("#view_set_password_input_OldPassword_eye,#view_set_password_input_NewPassword_eye,#view_set_password_input_ConfirmNewPassword_eye").off("click").on("click",function(){
         if($(this).hasClass("slash")){
            $(this).removeClass("slash");
            $(this).parent().find("input").prop("type","text");
         }
         else{
             $(this).addClass("slash");
             $(this).parent().find("input").prop("type","password");
         }      
         $(this).parent().find("input").focus();        
     });
          
     //password indicator
     $("#view_set_password_input_NewPassword").off("change").on("change", function () {        
         var current_password=$("#view_set_password_input_NewPassword").val();
                 
//         $("#view_set_password_progress_NewPassword").progress("update progress",0).progress("set label",current_password.replace(/[-’/`~!#*$@_%+=.,^&(){}[\]|;:”<>?\\]/g,"").length+"|"+current_password);
//                 .progress("set label",(current_password.replace(/[A-Z0-9]/g,"").length +"||"+ current_password.replace(/[a-z0-9]/g,"").length +"||"+ current_password.replace(/[A-Za-z]/g,"").length));
        
        if (current_password.length == 0) {
            $("#view_set_password_progress_NewPassword").progress("update progress",0).progress("set label","No Password");
        }else if(current_password.length < 8){
            $("#view_set_password_progress_NewPassword").progress("update progress",1).progress("set label","Password too short");
        }
        else if(current_password.length >= 8 && (current_password.replace(/[A-Z0-9-’/`~!#*$@_%+=.,^&(){}[\]|;:”<>?\\]/g,"").length==0 || current_password.replace(/[a-z0-9-’/`~!#*$@_%+=.,^&(){}[\]|;:”<>?\\]/g,"").length==0 || current_password.replace(/[A-Za-z-’/`~!#*$@_%+=.,^&(){}[\]|;:”<>?\\]/g,"").length==0)){
            $("#view_set_password_progress_NewPassword").progress("update progress",1).progress("set label","use numbers,small and capital characters");
        }
        else if(current_password.length >= 8 && current_password.length<12 && current_password.replace(/[A-Z0-9]/g,"").length>0 && current_password.replace(/[a-z0-9]/g,"").length>0 && current_password.replace(/[A-Za-z]/g,"").length>0){
            $("#view_set_password_progress_NewPassword").progress("update progress",2).progress("set label","medium");
        }
        else if(current_password.length>=12 && current_password.replace(/[A-Z0-9]/g,"").length>0 && current_password.replace(/[a-z0-9]/g,"").length>0 && current_password.replace(/[A-Za-z]/g,"").length>0 && current_password.replace(/[a-zA-Z0-9]/g,"").length==0){
            $("#view_set_password_progress_NewPassword").progress("update progress",3).progress("set label","good password with no special characters");
        }
        else if(current_password.length>=12 && current_password.replace(/[A-Z0-9]/g,"").length>0 && current_password.replace(/[a-z0-9]/g,"").length>0 && current_password.replace(/[A-Za-z]/g,"").length>0 && current_password.replace(/[a-zA-Z0-9]/g,"").length>0){
            $("#view_set_password_progress_NewPassword").progress("update progress",4).progress("set label","secure password");
        }
        
    });   
    
    //var not_encrypted= await window.electron.ipcRenderer_invoke("load_wallet",null);
    //set password
    $("#view_set_password_button_setPassword").off("click").on("click",async function(){
        if(!startup){
            var match_old_pw=await window.electron.ipcRenderer_invoke("compare_password",$("#view_set_password_input_OldPassword").val());             
            if(!match_old_pw){
                show_popup_action(templ_loads,"error","Old Password is incorrect!");
                return;
            }
        }
        
        var new_pw=$("#view_set_password_input_NewPassword").val();
        
        if(new_pw==""){
            if(startup){
                await window.electron.ipcRenderer_invoke('create_wallet', seed_words.seed_words, seed_words.seed_pw, null,true);
                await window.electron.ipcRenderer_invoke("load_wallet", null);
                view_overview();
                return;
            }                      
            var is_set= await window.electron.ipcRenderer_invoke("set_password",new_pw);
           /* show_popup_action(templ_loads,"info","No Password in use <br> => Wallet is not encrypted!!!",2500);
            
            //reset form or return to settings?
            $("#view_set_password_input_OldPassword").val("");
            $("#view_set_password_input_NewPassword").val("");
            $("#view_set_password_input_ConfirmNewPassword").val("");
            $("#view_set_password_progress_NewPassword").progress("update progress",0).progress("set label","No Password");*/
            view_settings();
            setTimeout(function(){show_popup_action(templ_loads,"info","No Password in use <br> => Wallet is not encrypted!!!",2500);},300);
            
            return;
        }
        
        if(new_pw.length >= 8 && new_pw.replace(/[A-Z0-9]/g,"").length>0 && new_pw.replace(/[a-z0-9]/g,"").length>0 && new_pw.replace(/[A-Za-z]/g,"").length>0){
            
            if($("#view_set_password_input_ConfirmNewPassword").val()!=new_pw){
                show_popup_action(templ_loads,"error","Confirm Password does not match!");
                return;
            }
            
            if(startup){
                await window.electron.ipcRenderer_invoke('create_wallet', seed_words.seed_words, seed_words.seed_pw, new_pw,true);
                await window.electron.ipcRenderer_invoke("load_wallet", new_pw);
                view_overview();
                return;
            }
            
            var is_set= await window.electron.ipcRenderer_invoke("set_password",new_pw);
            view_settings();
            setTimeout(function(){show_popup_action(templ_loads,"info","Password was set!");},300);
           /* show_popup_action(templ_loads,"info","Password was set!");

            //reset form or return to settings?
            $("#view_set_password_input_OldPassword").val("");
            $("#view_set_password_input_NewPassword").val("");
            $("#view_set_password_input_ConfirmNewPassword").val("");
            $("#view_set_password_progress_NewPassword").progress("update progress",0).progress("set label","No Password");*/
        }
        else{
            show_popup_action(templ_loads,"error","Password is too weak!");
        }
        
        
        
        
        
    });
     
}

async function view_backup_phrase() {
    window.scrollTo(0, 0);
    $("body").html(build_from_key("view_backup_phrase")).hide();
    

    $("#navbar_title").text("View Backup Phrase");

    $("body").fadeIn(100, "easeInOutQuad");

    $("#view_back_overview").off("click").on("click", function () {
        view_overview();
    });
    $("#view_back_current").off("click").on("click", function () {
        view_settings();
    });

    $("#unhide_backupphrase").off("click").on("click", async function () {
        var pw_result = await window.electron.ipcRenderer_invoke("compare_password", "");
        
        if (pw_result) {
            var backup_phrase = await window.electron.ipcRenderer_invoke("get_wallet_seed");
            $("#view_backup_phrase_phrase").html("<b>Seed Words:</b><br>" + backup_phrase.seed_words + "<br><br><b>Seed Password:</b><br>" + (backup_phrase.seed_pw == null ? "<br><br><br>" : (backup_phrase.seed_pw + "<br><br><br>")));
            $("#unhide_backupphrase").remove();
        } else {

            show_dialogue_input(templ_loads, "Enter Password", "Your password is required.<br>", "Password", "password", "Show Backup Phrase", "Abort", "data", async function () {
                var pw_result = await window.electron.ipcRenderer_invoke("compare_password", $("#dialogues_input_input").val());
                if (pw_result) {
                   var backup_phrase = await window.electron.ipcRenderer_invoke("get_wallet_seed");
                   $("#view_backup_phrase_phrase").html("<b>Seed Words:</b><br>" + backup_phrase.seed_words + "<br><br><b>Seed Password:</b><br>" + (backup_phrase.seed_pw == null ? "<br><br><br>" : (backup_phrase.seed_pw + "<br><br><br>")));
                   $('.ui.modal').modal("hide");
//                    clean_modal("input");
                   $("#unhide_backupphrase").remove();
                } else {
                    $("#dialogues_input_yes").transition('shake');
                    show_popup_action(templ_loads, "error", "Wrong password!");
                }

            }, async function () {});
        }


    });
                
}

function view_about() {
    window.scrollTo(0, 0);
    $("body").html(build_from_key("about")).hide();


    $("#navbar_title").text("About");

    $("body").fadeIn(100, "easeInOutQuad");

    $("#view_back_overview").off("click").on("click", function () {
        view_overview();
    });
    $("#view_back_current").off("click").on("click", function () {
        view_settings();
    });
}

async function view_backup(startup) {
    window.scrollTo(0, 0);
//    $("body").html(build_from_key("backup")).hide();

       
    var segment_menu='<div id="view_backup_segment" class="ui segment" style="background: #594663;margin: auto;width:95%;max-width: 50rem;margin-top:6rem;text-align: center;">';
    var segment='<div id="view_backup_segment" class="ui segment" style="background: #594663;margin: auto;width:95%;max-width: 50rem;text-align: center;">';
    
//   
//    var page_words_1=$(templ_loads["backup"]).find("#view_backup_page_words_1");
//    var page_words_plus=$(templ_loads["backup"]).find("#view_backup_page_words_2_plus");
//    var page_seed_password=$(templ_loads["backup"]).find("#view_backup_page_seed_password");
//    var page_verify=$(templ_loads["backup"]).find("#view_backup_page_verify");
    
    
    
    
    
    if(startup){
    var seed_words=await window.electron.ipcRenderer_invoke("get_new_seed"); 
//    console.log(seed_words);
    view_backup_page_start_up_info(startup,segment,seed_words);
        
    }
    
    else{
    var seed_words=await window.electron.ipcRenderer_invoke("get_wallet_seed");        
           
    view_backup_page_start_up_info(startup,segment_menu,seed_words);
    
    //show alternate backup method
    }
      
}

async function view_backup_page_start_up_info(startup,segment,seed_words){
    var nav_bar=templ_loads["sub_navbar"];
    var page_start_up_info=$(templ_loads["backup"]).find("#view_backup_page_start_up_info");
    var has_backup=await window.electron.ipcRenderer_invoke("has_backup");
    
    if(startup){$("body").html(segment+page_start_up_info.html()+"</div>").hide(); }
    else{$("body").html(nav_bar+segment+page_start_up_info.html()+"</div>").hide(); }
    
      
    $("#navbar_title").text("Back up Wallet");

    $("body").fadeIn(100, "easeInOutQuad");

    $("#view_back_overview").off("click").on("click", function () {
        view_overview();
    });
    $("#view_back_current").off("click").on("click", function () {
        view_settings();
    });
    
    $("#view_backup_it_is_safe").off("click").on("click",function(e){         
       if($("#view_backup_it_is_safe_checkbox").prop("checked")==true){
        $("#view_backup_it_is_safe_checkbox").prop("checked", false);} 
        else{
        $("#view_backup_it_is_safe_checkbox").prop("checked", true);}
    });
      
      
   $("#view_backup_it_is_safe_checkbox").off("click").on("click", function (e) {    
      if($("#view_backup_it_is_safe_checkbox").prop("checked")==true){
        $("#view_backup_it_is_safe_checkbox").prop("checked", false);} 
        else{
        $("#view_backup_it_is_safe_checkbox").prop("checked", true);}
   });   
     
    $("#view_start_backup_button").off("click").on("click", function () {
        if($("#view_backup_it_is_safe_checkbox").prop("checked")==true){
            view_backup_page_write_down(startup,segment,seed_words,1); 
        }
        else{
           show_popup_action(templ_loads, "error", 'Select the "It is safe" checkbox!');
        }
       
    });
    
    if(startup){
    
        $("#view_start_backup_button_skip").off("click").on("click", function () {
            view_backup_page_seed_password_no_backup(startup,segment,seed_words);
        });

        $("#view_start_backup_button_abort").off("click").on("click", function () {
            view_start_up();
        });
        
        $("#view_savebackup_file_button").remove();
    }
    else{
        $("#view_start_backup_button_skip").remove();
        $("#view_start_backup_button_abort").remove();
        
        $("#view_savebackup_file_button").off("click").on("click", async function () {
            var file_was_saved=await window.electron.ipcRenderer_invoke('save_as_dialogue');
            if(file_was_saved){show_popup_action(templ_loads, "info", 'Backup File was saved!');}
        });
    }
    
    if(has_backup){
        $("#view_backup_page_start_up_info_message_record_your_backup").html(
              '  <i class="check circle icon"></i>'
          +'  <div class="header">'
          +'      You seem to have a backup!'
          +'  </div>'
          +'  You can do another backup if you like or save a "light_wallet.dat" file (a Backup incl. Addressbook and Settings)').removeClass("warning").addClass("info");
    }
     
}

function view_backup_page_write_down(startup,segment,seed_words,page){
    var nav_bar=templ_loads["sub_navbar"];
    var write_down_page_1=$(templ_loads["backup"]).find("#view_backup_page_words_1");
    var write_down_page_more=$(templ_loads["backup"]).find("#view_backup_page_words_more");
    
    var seed_words_split=seed_words.seed_words.split(" ");
            
    if(page<2){
        if(startup){$("body").html(segment+write_down_page_1.html()+"</div>");  }
        else{
            $("body").html(nav_bar+segment+write_down_page_1.html()+"</div>"); 
        }
         
    }
    if(page>=2){
        if(startup){$("body").html(segment+write_down_page_more.html()+"</div>"); }
        else{
        $("body").html(nav_bar+segment+write_down_page_more.html()+"</div>");     
        }
        
        $("#view_backup_page_words_more_progress").text((page*6)+"/24");
        
    }
        
    $("#navbar_title").text("Back up Wallet");
    $("#view_back_overview").off("click").on("click", function () {
        view_overview();
    });
    $("#view_back_current").off("click").on("click", function () {
        view_settings();
    }); 
    
       
    var counter=0; 
    $(".seed_words_list_element h2").each(function(){     
        $(this).html('<span style="opacity: 0.5;">'+(((page-1)*6)+counter+1)+'.</span><span>&nbsp; '+(seed_words_split[((page-1)*6)+counter])+'</span>');
        counter++;
    });
    
    $("#view_backup_go_back").off("click").on("click", function () {
        if(page==1){
            view_backup_page_start_up_info(startup,segment,seed_words);
        }
        else{
            view_backup_page_write_down(startup,segment,seed_words,page-1);
        }        
    });
    
      
    if(page==4){
    $("#view_backup_next_words").text("Proceed");    
    }
    
    $("#view_backup_next_words").off("click").on("click", function () {
         if(page<4){
         view_backup_page_write_down(startup,segment,seed_words,page+1);}        
         else{
            if(startup){view_backup_page_seed_password_define(startup,segment,seed_words);}
            else{
                if(seed_words.seed_pw==null){
                    view_backup_page_verify(startup,segment,seed_words);
                }
                else{
                    view_backup_page_seed_password_show(startup,segment,seed_words);
                }
            }
         }
    });
        
}

function view_backup_page_seed_password_define(startup,segment,seed_words){
    var backup_page_seed_password=$(templ_loads["backup"]).find("#view_backup_page_seed_password_define");
       
                       
    $("body").html(segment+backup_page_seed_password.html()+"</div>"); 
                  
    $("#view_backup_go_back").off("click").on("click", function () {
        seed_words.seed_pw=null;
        view_backup_page_write_down(startup,segment,seed_words,4)
    });  
    
    $("#view_backup_next_words").off("click").on("click", function () {
        var pw=$("#view_backup_seed_password").val();
        if(pw==""){
            pw=null;
        }
        seed_words.seed_pw=pw;
        view_backup_page_verify(startup,segment,seed_words);
        
    });
    
     $("#view_backup_seed_password_eye,#view_backup_seed_password_confirm_eye").off("click").on("click",function(){
         if($(this).hasClass("slash")){
            $(this).removeClass("slash");
            $(this).parent().find("input").prop("type","text");
         }
         else{
             $(this).addClass("slash");
             $(this).parent().find("input").prop("type","password");
         }      
         $(this).parent().find("input").focus();        
     }); 
     
     input_clear_button_func("#view_backup_seed_password","#view_backup_seed_password_clear");
        
}

function view_backup_page_seed_password_no_backup(startup,segment,seed_words){
    var backup_page_seed_password=$(templ_loads["backup"]).find("#view_backup_page_seed_password_no_backup");
       
                       
    $("body").html(segment+backup_page_seed_password.html()+"</div>"); 
                  
    $("#view_backup_go_back").off("click").on("click", function () {
        seed_words.seed_pw=null;
        view_backup(startup);
    });  
    
    $("#view_backup_next_words").off("click").on("click", async function () {
        var seed_pw=$("#view_backup_seed_password").val();
        var seed_pw_confirm=$("#view_backup_seed_password_confirm").val();
        if(seed_pw!=seed_pw_confirm){
            show_popup_action(templ_loads,"error","Confirm password does not match");
            return;
        }
        if (seed_pw == "") {
                    seed_pw = null;
        }
        await window.electron.ipcRenderer_invoke('create_wallet', seed_words.seed_words, seed_pw, null);
        await window.electron.ipcRenderer_invoke("load_wallet", null);       
        view_overview();
    });
    
    $("#view_backup_seed_password_eye,#view_backup_seed_password_confirm_eye").off("click").on("click",function(){
         if($(this).hasClass("slash")){
            $(this).removeClass("slash");
            $(this).parent().find("input").prop("type","text");
         }
         else{
             $(this).addClass("slash");
             $(this).parent().find("input").prop("type","password");
         }      
         $(this).parent().find("input").focus();        
     }); 
     
     input_clear_button_func("#view_backup_seed_password","#view_backup_seed_password_clear");
     input_clear_button_func("#view_backup_seed_password_confirm","#view_backup_seed_password_confirm_clear");
        
}

function view_backup_page_seed_password_show(startup,segment,seed_words){
     var nav_bar=templ_loads["sub_navbar"];
     var backup_page_seed_password=$(templ_loads["backup"]).find("#view_backup_page_seed_password_show_only");
                       
    $("body").html(nav_bar+segment+backup_page_seed_password.html()+"</div>");
    
    $("#navbar_title").text("Back up Wallet");
    $("body").fadeIn(100, "easeInOutQuad");
    $("#view_back_overview").off("click").on("click", function () {
        view_overview();
    });
    $("#view_back_current").off("click").on("click", function () {
        view_settings();
    }); 
      
    
    $("#view_backup_seed_password_view_only").text(seed_words.seed_pw);
                  
    $("#view_backup_go_back").off("click").on("click", function () {
        view_backup_page_write_down(startup,segment,seed_words,4);
    });  
    
    $("#view_backup_next_words").off("click").on("click", function () {
        view_backup_page_verify(startup,segment,seed_words); 
    });
        
}

function view_backup_page_verify(startup,segment,seed_words){
    var nav_bar=templ_loads["sub_navbar"];   
    var backup_page_verify=$(templ_loads["backup"]).find("#view_backup_page_verify");
                                          
    if(startup){$("body").html(segment+backup_page_verify.html()+"</div>");  }
    else {
        $("body").html(nav_bar + segment + backup_page_verify.html() + "</div>");
        $("#navbar_title").text("Back up Wallet");
        $("body").fadeIn(100, "easeInOutQuad");
        $("#view_back_overview").off("click").on("click", function () {
            fill_backup_seed_words=[];    
            $(".aliwa_input_field,.aliwa_input_field_red").each(function(){
                fill_backup_seed_words.push($(this).val());           
            });
            view_overview();
        });
        $("#view_back_current").off("click").on("click", function () {
            fill_backup_seed_words=[];    
            $(".aliwa_input_field,.aliwa_input_field_red").each(function(){
                fill_backup_seed_words.push($(this).val());           
            });
            view_settings();
        });

    }
                 
    var input_words_html="";
    
    var seed_words_split=seed_words.seed_words.split(" ");
    
    for(var i=0;i<seed_words_split.length;i++){
    var next_value=(fill_backup_seed_words.length>i ? fill_backup_seed_words[i] : "");
    input_words_html+=' <span class="aliwa_input_label aliwa_input_label_distance">'+(i+1)+'.</span> <br>'
       +' <div class="ui input large fluid" style="margin-top:0.5rem;">   '     
       +'     <input id="view_backup_verify_seed_word_no_'+i+'" type="text" value="'+next_value+'" class="aliwa_input_field backup_validation_word" placeholder="Enter word '+(i+1)+'" validation="'+seed_words_split[i]+'">'
       +'     <i id="view_backup_verify_seed_word_no_'+i+'_clear" class="times link icon white inverted large" style="margin-top: 0.5rem"></i>'
       +'<div class="aliwa_autocomplete_popup ui fluid flowing popup bottom left transition hidden" style="margin-top:4rem;font-size:1.5rem;display:block;padding:0;padding-top:1rem;"></div>'  
 /*      
//        +'  <div class="ui flowing popup top left transition hidden">'
// +' <div class="ui three column divided center aligned grid">'
// +'   <div class="column">'
//  +'    <h4 class="ui header">Basic Plan</h4>'
//  +'    <p><b>2</b> projects, $10 a month</p>'
// +'     <div class="ui button">Choose</div>'
//  +'  </div>  '
//+'  </div>'
        
*/        
       +' </div>';
       
    }         
    $("#view_back_input_fields").append(input_words_html);
    
    
    if(seed_words.seed_pw!=null){
        var password_value=(fill_backup_seed_pw != null ? fill_backup_seed_pw : "");
        var seed_Password_confirm='<br><br> <span class="aliwa_input_label aliwa_input_label_distance">Confirm Seed-Password</span> <br>'   
          +' <div class="ui input large fluid" style="margin-top:0.5rem;">'
           +'     <i id="view_backup_seed_password_confirm_eye" class=" eye slash link icon white inverted large" style="margin-top: 0.5rem;margin-right:1rem;"></i>'
           +'     <input id="view_backup_seed_password_confirm" type="password" value="'+password_value+'" class="aliwa_input_field" placeholder="seed-password" validation="'+seed_words.seed_pw+'">'
           +'     <i id="view_backup_seed_password_confirm_clear" class="times link icon white inverted large" style="margin-top: 0.5rem"></i>'   
          +'  </div> ';
  
        $("#view_back_input_fields").append(seed_Password_confirm);
    }
    
    $(".aliwa_input_field,.aliwa_input_field_red").each(function(){  
//        console.log(("#"+$(this).attr("id")),("#"+$(this).attr("id")+"_clear"));
        input_clear_button_func(("#"+$(this).attr("id")),("#"+$(this).attr("id")+"_clear"));
        var last_change="";
        $(this).parent().find(".backup_validation_word").off("change").on("change",function(){
            var this_input_field=$(this);
            if(last_change!=$(this).val()){
                last_change=$(this).val();
            }
            else{return;}
            console.log(autocomplete_bip39($(this).val(),seed_words_split));
            var auto_text=autocomplete_bip39($(this).val(),seed_words_split);
             $(this).parent().find(".aliwa_autocomplete_popup").css("visibility","hidden");
            if(auto_text.length>0){
                var auto_items="";
                for(var i=0;i<auto_text.length;i++){
                  auto_items+='<div class="aliwa_autocomplete_item_hover">'+auto_text[i]+"</div>";  
                }
                
                $(this).parent().find(".aliwa_autocomplete_popup").html(auto_items).css("visibility","visible");
//                $(this).parent().find(".aliwa_autocomplete_popup").off("click").on("click",function(){
//                    $(this).css("visibility","hidden");
//                });

                $(this).parent().find(".aliwa_autocomplete_popup .aliwa_autocomplete_item_hover").each(function(){
                    $(this).off("click").on("click",function(){
                        this_input_field.val($(this).text());
                    });
                    
                });
                
                var that=$(this).parent().find(".aliwa_autocomplete_popup");
                
                $('body').off("click").on('click',function(){
                that.css("visibility","hidden");    
                });
                
               $(document).off("keydown").on('keydown', function(e) {                
                    console.log(e.key);
                    if (e.key == "Escape") $(".aliwa_autocomplete_popup").css("visibility","hidden");
                    if (e.key == "Delete") $(".aliwa_autocomplete_popup").css("visibility","hidden"); 
                    if (e.key == "Tab") $(".aliwa_autocomplete_popup").css("visibility","hidden"); 
                    
               });

                
            }
//            $(this).parent().find(".menu").remove();
//            $(this).parent().append('<div class="menu"><div class="item">Arabic</div><div class="item">Barabic</div></div>');          
        });
    });
        
    $("#view_backup_seed_password_confirm_eye").off("click").on("click",function(){
         if($(this).hasClass("slash")){
            $(this).removeClass("slash");
            $(this).parent().find("input").prop("type","text");
         }
         else{
             $(this).addClass("slash");
             $(this).parent().find("input").prop("type","password");
         }      
         $(this).parent().find("input").focus();        
     });          
        
    
                        
    $("#view_backup_go_back").off("click").on("click", function () {
        fill_backup_seed_words=[];    
        $(".aliwa_input_field,.aliwa_input_field_red").each(function(){
            fill_backup_seed_words.push($(this).val());           
        });
        
        if(seed_words.seed_pw!=null){       
            fill_backup_seed_pw=$("#view_backup_seed_password_confirm").val();         
        } 
        
        
        if(startup){view_backup_page_seed_password_define(startup,segment,seed_words);}
            else{
                if(seed_words.seed_pw==null){
                    view_backup_page_write_down(startup,segment,seed_words,4);
                }
                else{
                    view_backup_page_seed_password_show(startup,segment,seed_words);
                }
            }
    });  
    
    $("#view_backup_confirm_backup").off("click").on("click", async function () {
        var found_wrong_word=false;
        
        $(".aliwa_input_field,.aliwa_input_field_red").each(function(){
            if($(this).val() != $(this).attr("validation")){
                $(this).removeClass("aliwa_input_field").removeClass("aliwa_input_field_red");
                $(this).addClass("aliwa_input_field_red");               
                
                if(!found_wrong_word){
                    $([document.documentElement, document.body]).animate({
                    scrollTop: ($(this).offset().top-100)
                    }, 1000);
                    scroll_pos=true;
                }
                found_wrong_word=true;
            }
            else{
                $(this).removeClass("aliwa_input_field").removeClass("aliwa_input_field_red");
                $(this).addClass("aliwa_input_field");      
            }
        });
        
        if(seed_words.seed_pw!=null){         
            if($("#view_backup_seed_password_confirm").val()!=$("#view_backup_seed_password_confirm").attr("validation")){
                found_wrong_word=true;
            }
        }
        
        if(!found_wrong_word || true){
            fill_backup_seed_pw=null;
            fill_backup_seed_words=[];         
            if (startup) {
                if (seed_words.seed_pw == "") {
                    seed_words.seed_pw = null;
                }
//                await window.electron.ipcRenderer_invoke('create_wallet', seed_words.seed_words, seed_words.seed_pw, null);
//                await window.electron.ipcRenderer_invoke("load_wallet", null);
//                view_overview();
                  view_set_password(true,seed_words); 
            } else {
                await window.electron.ipcRenderer_invoke("set_backup");
                view_settings();
            }
            
            
        }
        else{
            show_popup_action(templ_loads,"error","Backup Phrase is not correct!",1500);
        }
                          
    });
}

function autocomplete_bip39(input,seed_words){  
    var outlist=[];
    if(input.length>0){
        for(var i=0;i<seed_words.length;i++){
            if(seed_words[i].startsWith(input)){
                outlist.push(seed_words[i]);
            }
        }
    }
    return outlist;   
}



