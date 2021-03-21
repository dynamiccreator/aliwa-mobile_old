var view_builder={
    start_up:["start_up"],
    main_menu:["navbar","main_tab","message","overview"],
    transactions:["navbar","main_tab","transactions"],
    transaction_details:["single_transaction"],
    settings:["sub_navbar","settings"],
//        backup_info:["sub_navbar","backup_info"],
//        backup_action:["sub_navbar","backup_action"],
//        
        view_backup_phrase:["sub_navbar","view_backup_phrase"],
//        
        set_password:["sub_navbar","set_password"],
//        
//        native_currency:["sub_navbar","native_currency"],
//        language:["sub_navbar","language"],
//        custom_server:["sub_navbar","language"],
//        about:["sub_navbar","about"],
    send:["sub_navbar","send"],
    receive:["sub_navbar","receive"],
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


 async function gui() {
     console.log("gui");
     $('meta[name=aliwa_current_site]').attr('content',"test");
     console.log("current site:"+$('meta[name=aliwa_current_site]').attr('content'));
    
   //start_up
    view_start_up();

    }
//    gui();

 
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
         view_create_wallet();    
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
        view_import_from_seed();
    });
    
    
    $("#view_start_up_button_create_new_wallet").off("click").on("click",async function(){view_create_wallet();});
    $("#view_start_up_button_import_wallet").off("click").on("click",async function(){view_import_from_seed();});
    
}

function view_create_wallet(){
    //quick testing
    setTimeout(async function(){
        var seed_words= await window.electron.ipcRenderer_invoke('get_new_seed');
        show_dialogue_info(templ_loads,"SEED WORDS",("This are your seed words:<br><br>"+seed_words),"OK",function(){
            show_dialogue_input(templ_loads,"Enter a Seed Password (optional)","Enter a seed password to increase security or leave it empty for no seed password.","Seed Password","password","Proceed","Abort","data",async function(){ 
                        var seed_pw=$("#dialogues_input_input").val();
                        if(seed_pw==""){
                            seed_pw=null;
                        }
                        await window.electron.ipcRenderer_invoke('create_wallet',seed_words,seed_pw,null);
                        await window.electron.ipcRenderer_invoke("load_wallet",null);  
                        $('.ui.modal').modal("hide");
                        setTimeout(function(){ view_overview();},300);
                                                                                   
                 },async function(){});
        });
        
        
    },500);
    
}


function view_import_from_seed() {
    show_dialogue_input(templ_loads, "Enter your seed.", "Enter your seed words", "Seed Words", "text", "Proceed", "Abort", "data", async function () {
        
        var seed_words = $("#dialogues_input_input").val();
        if (seed_words == "") {
            seed_words = null;
        }
        setTimeout(function () {
            show_dialogue_input(templ_loads, "Enter your seed password.", "Enter your seed password", "Seed password", "text", "Proceed", "Abort", "data", async function () {

                var seed_pw = $("#dialogues_input_input").val();
                if (seed_pw == "") {
                    seed_pw = null;
                }

                await window.electron.ipcRenderer_invoke('create_wallet', seed_words, seed_pw, null);
                await window.electron.ipcRenderer_invoke("load_wallet", null);
                $('.ui.modal').modal("hide");
                setTimeout(function () {
                    view_overview();
                }, 300);


            }, async function () {});
            
        },300);    
                         
    }, async function () {});

}

function view_overview(){
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

        //update send
        $("#view_send_available_balance").text(global_balance.available);
    }
}
async function start_sync_interval(){   
    if(sync_interval==null){
      sync_interval=setInterval(async function(){
            load_balance();     
            }, 1000);
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
                    set_balance();

                    
                    //update transactions
                   if($("#view_transactions_table_body").html()!=null){
                        console.log($("#view_transactions_table_body"))

                    var cur_num=parseInt($("#view_transactions_pagination_container_page_third").text());
                    var j_clone=await transactions_pagination(cur_num-1, "height", true);
                    $('#view_transactions_table_body').html(j_clone.find("#view_transactions_table_body").html());
                    transactions_pagination_actions();
                    }

                    //IF new transactions:
                    //show notifications on new txs
                    //update tx and etc.                    
                }

                
            } else {
//                  console.error(sync_state)
                    show_popup_action(templ_loads,"info","waiting for server...",250);
            }
}
        
        
function view_send(user_inputs){
    window.scrollTo(0, 0);
    $("body").html(build_from_key("send")).hide();
    
    //manipulate
    $("#navbar_title").text("Send");
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
         view_overview();
     });
     $("#view_back_current").off("click").on("click",function(){
         view_overview();
     });
     
     $("#view_send_button_copy").off("click").on("click",async function(){
          var clip_text=await navigator.clipboard.readText();
//          console.log(clip_text);
          $("#view_send_input_destination").val(clip_text.trim());
          input_clear_button_func("#view_send_input_destination","#view_send_input_destination_clear");
     });
     
     $("#view_send_button_scan").off("click").on("click",async function(){
          //cordova camera
          //qr reader
          //....
     });
     
     $("#view_send_button_address_book").off("click").on("click",function(){
          view_address_book_contacts();
     });
     
     //prepare input clearing
     input_clear_button_func("#view_send_input_destination","#view_send_input_destination_clear");
     input_clear_button_func("#view_send_input_label","#view_send_input_label_clear");
     input_clear_button_func("#view_send_input_note","#view_send_input_note_clear");
     input_clear_button_func("#view_send_input_amount","#view_send_input_amount_clear");
     
     //show available balance
     if(global_balance!=null){
     $("#view_send_available_balance").text(global_balance.available);}
     
     //max amount
     $("#view_send_button_max_amount").off("click").on("click",async function(){        
        var max_get=await get_max_amount();
        if(max_get.max>0){
            $("#view_send_input_amount").val(max_get.max);
            $("#view_send_fee").text(numeral(max_get.fee).format("0.00000000")); 
            input_clear_button_func("#view_send_input_amount","#view_send_input_amount_clear");
        }
        else{
            show_popup_action(templ_loads,"error","Zero Balance",500);
        }
          
     });
     
     //send button
     $("#view_send_button_send_transaction").off("click").on("click",async function(){
         //check address
         var address=$("#view_send_input_destination").val();
         var narration=$("#view_send_input_note").val();
         var amount=$("#view_send_input_amount").val();
         
         //cut if have more than 8 digits
         if(amount.includes(".")){
            var amount_split=amount.split(".");         
            var amount_digits=amount_split[1].length>8 ? amount_split[1].substring(0,8) : amount_split[1];
            amount=parseFloat(amount_split[0]+"."+amount_digits);
         }
         $("#view_send_input_amount").val(amount);
         
         var is_valid_form=await check_send_form(address,narration,amount);
         if(is_valid_form){
             var tx_dest=[];
             
             if(narration.length==0){
               tx_dest.push({amount:amount,destination_address:address});   
             }
             else{
                 tx_dest.push({amount:amount,destination_address:address,narration:narration});   
             }
             var tx_info=await window.electron.ipcRenderer_invoke("get_raw_tx",tx_dest);
             if(tx_info==false){show_popup_action(templ_loads,"error","Unknown error"); return;}
             
             var fee=tx_info.fee;
             var tx_text="";
             var temp_tx_text="";
             var total_send=numeral(0);
             total_send.add(fee);
             for(var i=0;i<tx_dest.length;i++){
                 total_send.add(tx_dest[i].amount);
                 temp_tx_text+="<b>Transaction "+(i+1)+": </b>"+tx_dest[i].amount+" ALIAS -> "+tx_dest[i].destination_address+"<br>";
                 if(tx_dest[i].narration!=undefined){
                    temp_tx_text+="Narration: "+tx_dest[i].narration+"<br><br>";
                 }
                else{temp_tx_text+="<br><br>"}
             }
             tx_text+="<b>Send Total: "+total_send.value()+' ALIAS </b> (incl. '+fee+' ALIAS fee)<div class="ui divider"></div><br>';
             tx_text+=temp_tx_text;
             
             var pw_result=await window.electron.ipcRenderer_invoke("compare_password","");
             show_dialogue_modal(templ_loads,"Confirm Transaction(s)?","Confirm the following transaction(s):<br><br>"+tx_text,(pw_result ? "Send Now":"Confirm"),"Abort",tx_dest,async function(){
                // ask for password                  
                 console.log("after dialogue:",tx_dest);
                 
                 if(pw_result){ // no password
                    await window.electron.ipcRenderer_invoke("send",tx_info); 
                    show_popup_action(templ_loads,"info",'<i class="coins icon"></i>&nbsp;Coins sent!',1500);
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
     });
}

async function check_send_form(address,narration,amount){
         var address=$("#view_send_input_destination").val();
         var narration=$("#view_send_input_note").val();
         var amount=$("#view_send_input_amount").val();
         
        if(address.replace(/[a-km-zA-HJ-NP-Z1-9]/g,"").length>0 || address[0]!="S" || address.length!=34){
            $("#view_send_button_send_transaction").transition('shake');
            show_popup_action(templ_loads,"error","Invalid Alias Address");
            return false;
         }
         if(narration.length>24){
            $("#view_send_button_send_transaction").transition('shake'); 
            show_popup_action(templ_loads,"error","Narration too long! Max. 24 characters allowed."); 
            return false;
         }       
         if(amount<=0 || amount=="" ||  isNaN(amount)){
            $("#view_send_button_send_transaction").transition('shake'); 
            show_popup_action(templ_loads,"error","Amount must be greater than zero!");
            return false;
         }
         var max=await get_max_amount();//
         if(amount>max.max){
            $("#view_send_button_send_transaction").transition('shake'); 
            show_popup_action(templ_loads,"error","Not enough funds! Amount is too big!"); 
            return false;
         }       
         return true;
}

async function get_max_amount(destinations_for_send){
    var destinations=[];   
    if(destinations_for_send==undefined)
    {
    
         var address=$("#view_send_input_destination").val();       
         var available_balance=$("#view_send_available_balance").text();
         var note=$("#view_send_input_note").val();
         
         if(address.replace(/[a-km-zA-HJ-NP-Z1-9]/g,"").length>0 || address[0]!="S" || address.length!=34){
            address="SdrdWNtjD7V6BSt3EyQZKCnZDkeE28cZhr";//calc fee with dummy address 
         }
         
         if(note.length>24){
            note=note.substring(0,24); 
         }
         
         
         if(note==""){destinations.push({amount:available_balance,destination_address:address});}
         else{destinations.push({amount:available_balance,destination_address:address,narration:note});}
     }
     else{
         destinations=JSON.parse(JSON.stringify(destinations_for_send));
     }
     
     
     
         
        var fee=await window.electron.ipcRenderer_invoke("get_fee",destinations);
        var start=new Date().getUTCMilliseconds();
        while(fee==false){  
//            console.log( destinations[destinations.length-1].amount);           
            destinations[destinations.length-1].amount=numeral(destinations[destinations.length-1].amount).subtract(0.0001).value();          
            fee=await window.electron.ipcRenderer_invoke("get_fee",destinations);
//            console.log( destinations[destinations.length-1].amount);
//            fee=await window.electron.ipcRenderer_invoke("get_fee",destinations);
                       
        }
        console.log("wait: "+(new Date().getUTCMilliseconds()-start));
        var max=destinations[destinations.length-1].amount;
        return {max:max,fee:fee};
}

async function view_receive(){
    window.scrollTo(0, 0);
    $("body").html(build_from_key("receive")).hide();
    
    //manipulate
    $("#navbar_title").text("Receive");
    show_qr_code("view_qr_code","SBjfgngfijtgnjtgnitg");
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
     
     
     
     var address_obj=await window.electron.ipcRenderer_invoke("get_latest_receive_addr");
     $("#view_receive_address_address").text(address_obj.address);
     $("#view_receive_address_label").text(address_obj.label);
     $("#view_receive_address_label_input").val(address_obj.label!=null ? address_obj.label : "");
     
     $("#view_receive_address_hdkey").text("Your Current ALIAS Address (HD #"+(address_obj.pos+1)+")");
     
     
     input_clear_button_func("#view_receive_address_label_input","#view_receive_address_label_input_clear");
     
     $("#view_receive_address_label_input").off("change").on("change",async function(){
         $("#view_receive_address_label").text($("#view_receive_address_label_input").val());
         await window.electron.ipcRenderer_invoke("change_receive_address_label",address_obj.pos,$("#view_receive_address_label_input").val());
     });
     
//     $("#view_receive_address_label_input").off("input").on("input",function(){
//         $("#view_receive_address_label").text($("#view_receive_address_label_input").val());
//     });
     
     $("#view_receive_copy_button").off("click").on("click",function(){
          navigator.clipboard.writeText($("#view_receive_address_address").text());
         show_popup_action(templ_loads,"info","Address copied");
     });
    
    
      
}

function view_address_book_contacts(){
    window.scrollTo(0, 0);
    $("body").html(build_from_key("address_book_contacts")).hide();
    
    //manipulate
    $("#navbar_title").text("Address Book");
    $("#tab_first").html('<i class="address book outline icon"></i>&nbsp;Contacts');
    $("#tab_second").html('<i class="arrow down icon"></i>&nbsp;Receiving');
   
    //...
    
    $("body").fadeIn(100,"easeInOutQuad");
    $('.menu .item').tab();
    
    $("#view_back_overview").off("click").on("click",function(){
         view_overview();
     });
     $("#view_back_current").off("click").on("click",function(){
         view_overview();
     });
     
    actions_address_book_contacts();
     
}

function actions_address_book_contacts(){
   $("#tab_second").removeClass("active");
   $("#tab_first").removeClass("active");
   $("#tab_first").addClass("active");
   
   $('#tab_second').off("click").on("click",function(){
        tab_address_book_receiving();           
     }); 
     
    $(".address_book_line_contacts").off("click").on("click",function(){
       show_dialogue_address($(this),templ_loads,"contacts");
       
     }); 
}

function tab_address_book_contacts(){ 
    //set tab
    $('#tab_first').off("click");
       
     var j_load=$(templ_loads["address_book_contacts"]).contents().unwrap();
     //manipulate
     j_load.find("#test_confirm").text("infinite");
     
     //transition
     $('#address_book_tab_content').transition('slide left',50,function(){
          $('#address_book_tab_content').html(j_load);
          actions_address_book_contacts();
     },"easeInOutQuad").transition('slide right',100,"easeInOutQuad");
     
}

async function tab_address_book_receiving(){
    //set tab
    $('#tab_second').off("click");
    
    $("#tab_second").removeClass("active");
    $("#tab_first").removeClass("active");
    $("#tab_second").addClass("active");
    
    
     var j_load=$(templ_loads["address_book_receiving"]).contents().unwrap();
     //manipulate before insert
     j_load.find("#test_confirm").text("infinite");
    
     
    var list=await window.electron.ipcRenderer_invoke('list_receive_addresses',0, "pos", true);
    console.log(list);
    var table_list="";
    for(var i=0;i<list.result.length;i++){
        table_list+='<tr class="address_book_line_receiving">'
                +'<td data-label="HD #" >'+(list.result[i].pos+1)+'</td>'
                +'<td data-label="Label">'+(list.result[i].label==null ? "" :list.result[i].label)+'</td>'
                +'<td data-label="Address">'+list.result[i].address+'</td>'
                +'</tr>';
    }
     j_load.find("#view_address_book_receive_table_body").html(table_list);
     //transition
     $('#address_book_tab_content').transition('slide right',50,function(){
          $('#address_book_tab_content').html(j_load);
          tab_address_book_receiving_actions();
     },"easeInOutQuad").transition('slide left',100,"easeInOutQuad");
          
            
}

function tab_address_book_receiving_actions(){
    $('#tab_first').off("click").on('click',function(){
          tab_address_book_contacts();
      }); 
      
      $(".address_book_line_receiving").off("click").on("click",function(){
       show_dialogue_address($(this),templ_loads,"receiving");
       
     }); 
}



function view_settings(){
    window.scrollTo(0, 0);
    var j_load=$(build_from_key("settings"));
    
    //manipulate

    $("body").html(j_load).hide().fadeIn(100,"easeInOutQuad"); 
    $("#navbar_title").text("Settings");
    $("#view_settings_menu").hide().show("slide", { direction: "down" }, 100,"easeInOutQuad");
    
    
    
    
    
    $("#view_back_overview").off("click").on("click",function(){
         view_overview();
     });
     $("#view_back_current").off("click").on("click",function(){
         view_overview();
     });
     
     //settings
     $("#settings_password").off("click").on("click",function(){
         view_set_password();
     });
     
     $("#settings_backup_phrase").off("click").on("click",function(){
         view_backup_phrase();
     });
}

async function tab_to_transactions(){
    //set tab
    $('#tab_second').off("click");
    
    $("#tab_second").removeClass("active");
    $("#tab_first").removeClass("active");
    $("#tab_second").addClass("active");
    
   
    var table_html=await transactions_pagination(0,"height",true);     
         
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

async function transactions_pagination(i_page,i_field,i_direction){
    var j_load=$(templ_loads["transactions"]);
     //manipulate
     var j_clone=j_load.clone();
     var list=await window.electron.ipcRenderer_invoke("list_transactions",i_page,i_field,i_direction);
//    console.log(list);
    var sync_height=list.sync_height;  
    var result=list.result;
    var table_list="";
    
    for(var i=0;i<result.length;i++){
        var tx=result[i].tx;
        var confirmations=sync_height-result[i].height+1;
        var date=new Date(result[i].time*1000).toLocaleString();//result[i].height       
        var value=numeral(result[i].value).format("0.00[000000]");
        
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
        line.find("td:nth-child(1) h4 div span").text(""+confirmations);
        line.find("td:nth-child(1) h4 div div").text(""+(confirmations>0 ? "Confirmations" : "Unknown"));
        
        line.find("td:nth-child(2) ").text(""+date);
        
        //value
        if(value>0){
            line.find("td:nth-child(3) span").removeClass("red").addClass("green");
        }
        line.find("td:nth-child(3) span").text((value>0 ? "+": "")+value).css("font-size","1.2rem");
        
        line.find("td:nth-child(4) ").text(""+type);
        line.find("td:nth-child(5) ").text(""+address);
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
    //pagination actions
          $("#view_transactions_table_body tr").off("click").on("click",async function(){
                var tx=$(this).prop("id").split("_")[1];
                var full_tx=await window.electron.ipcRenderer_invoke("get_single_transaction",tx);
                console.log(full_tx);               
                show_dialogue_info(templ_loads,"Transaction",('<div style="width:100%;text-align:left"><b>Transaction ID:</b><br><a class="dialogue_link" href="https://chainz.cryptoid.info/alias/tx.dws?'+tx+'.htm">'+tx+'</a><div>'),"OK",function(){
           
                });
          });
          
          $("#view_transactions_pagination_container_left_arrow").off("click").on("click",async function(){
                var cur_num=parseInt($("#view_transactions_pagination_container_page_third").text());
                var j_clone=await transactions_pagination(cur_num-2, "height", true);
                $('#overview_segment').html(j_clone);
                transactions_pagination_actions();
          });
          
          $("#view_transactions_pagination_container_right_arrow").off("click").on("click",async function(){
                var cur_num=parseInt($("#view_transactions_pagination_container_page_third").text());
                var j_clone=await transactions_pagination(cur_num, "height", true);
                 $('#overview_segment').html(j_clone);
                 transactions_pagination_actions();
          });
          
          $(".tx_pagination_item_num").off("click").on("click",async function(){
              if(!isNaN(parseInt($(this).text()))){
                var j_clone=await transactions_pagination(parseInt($(this).text())-1, "height", true);
                $('#overview_segment').html(j_clone);
                transactions_pagination_actions();
              }
            
          });
          
          input_clear_button_func("#transactions_pagination_goto_input","#transactions_pagination_goto_input_clear");
          
          $("#transactions_pagination_goto_button").off("click").on("click",async function(){
//              var max=parseInt($("#view_transactions_pagination_container_page_fifth").text()-1);
                var page=parseInt($("#transactions_pagination_goto_input").val())-1;
                if(page>=0 && page <= parseInt($("#view_transactions_pagination_container_page_fifth").text())-1){
                    var j_clone=await transactions_pagination(page, "height", true);
                    $('#overview_segment').html(j_clone);
                    transactions_pagination_actions();
                }
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


function view_set_password(){
    window.scrollTo(0, 0);
    $("body").html(build_from_key("set_password")).hide();
    
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
     
     //clearings
     input_clear_button_func("#view_set_password_input_OldPassword","#view_set_password_input_OldPassword_clear");
     input_clear_button_func("#view_set_password_input_NewPassword","#view_set_password_input_NewPassword_clear");
     input_clear_button_func("#view_set_password_input_ConfirmNewPassword","#view_set_password_input_ConfirmNewPassword_clear");
     
     
     //password indicator
     $("#view_set_password_input_NewPassword").off("input").on("input", function () {
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
        var new_pw=$("#view_set_password_input_NewPassword").val();
        var is_set= await window.electron.ipcRenderer_invoke("set_password",new_pw);
        show_popup_action(templ_loads,"info","Password was set!");
        
        //reset form or return to settings?
        $("#view_set_password_input_OldPassword").val("");
        $("#view_set_password_input_NewPassword").val("");
        $("#view_set_password_input_ConfirmNewPassword").val("");
        $("#view_set_password_progress_NewPassword").progress("update progress",0).progress("set label","No Password");
        
        
    });
     
}

async function view_backup_phrase(){
    window.scrollTo(0, 0);
    $("body").html(build_from_key("view_backup_phrase")).hide();
    var backup_phrase=await window.electron.ipcRenderer_invoke("get_wallet_seed");
    $("#view_backup_phrase_phrase").html("<b>Seed Words:</b><br>"+backup_phrase.seed_words+"<br><br><b>Seed Password:</b>&nbsp;"+(backup_phrase.seed_pw == null ? "" : backup_phrase.seed_pw));
    $("#navbar_title").text("View Backup Phrase");
    
    $("body").fadeIn(100,"easeInOutQuad");
    
    $("#view_back_overview").off("click").on("click",function(){
         view_overview();
     });
     $("#view_back_current").off("click").on("click",function(){
         view_settings();
     });
    
}
