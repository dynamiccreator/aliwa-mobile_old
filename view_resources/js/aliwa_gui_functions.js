function show_dialogue_address(current_line,templ_loads,type){
        console.log("line clicked");
        var dialogue=$(templ_loads["dialogues"]).filter("#dialogues_"+type);
        $("body").append(dialogue);
        show_qr_code("modal_qr_code",current_line.children(':nth-child(3)').text());
        var title_text=(type=="contacts" ? "Contact Address - " : "Receiving Address - HD #");
        $("#dialogues_"+type+"_header").text(title_text+current_line.children(':nth-child(1)').text());
        $("#dialogues_"+type+"_address").text(current_line.children(':nth-child(3)').text());
        $("#dialogues_"+type+"_label").text(current_line.children(':nth-child(2)').text());
        
        
        //receiving payment
        $("#dialogues_"+type+"_receive_payment").off("click").on("click",function(){
            
            $('.ui.modal').modal({duration:0,onHidden:function(){
                clean_modal(type);           
            }}).modal("hide",function(){
                view_receive_payment({pos:(parseInt(current_line.children(':nth-child(1)').text())-1),address:current_line.children(':nth-child(3)').text(),label:current_line.children(':nth-child(2)').text()});
                clean_modal(type);      
            });                      
        });
       
        
        
        //copy        
        $("#dialogues_"+type+"_copy").off("click").on("click",function(){
            var clip_text=$("#dialogues_"+type+"_address").text();
            
//            console.log("copy to clipboard:"+clip_text);
           
           navigator.clipboard.writeText(clip_text);
           show_popup_action(templ_loads,"info","Address copied");
        });
        
        //send
        $("#dialogues_"+type+"_send").off("click").on("click",function(){  
            var copy_address=$("#dialogues_"+type+"_address").text();
            var copy_label=$("#dialogues_"+type+"_label").text();
            
            $('.ui.modal').modal({duration:0,onHidden:function(){
                clean_modal(type);           
            }}).modal("hide",function(){
                view_send({send_address:copy_address,send_label:copy_label}); 
                clean_modal(type);      
            });
                             
        });
        
        
       
              
        //edit
        $("#dialogues_"+type+"_edit").off('click').on('click',function(){           
            console.log("show popup");
            var button_top_pos=$("#dialogues_"+type+"_edit").position().top;
            button_top_pos-= $("#dialogues_"+type+"_edit_popup").height();
            console.log($("#dialogues_"+type+"_edit").height());
            $("#dialogues_"+type+"_edit_popup").css({position:"fixed",width:"90%",top:(button_top_pos-10)});
            
            $("#dialogues_"+type+"_edit_popup").toggle();
            $("#dialogues_"+type+"_edit_popup").off("click").on("click",function(e){ e.stopPropagation();});
            
            $("#dialogues_"+type+"_edit_input").val(current_line.children(':nth-child(2)').text());
            var unedited=$("#dialogues_"+type+"_edit_input").val();
            
            input_clear_button_func("#dialogues_"+type+"_edit_input", "#dialogues_"+type+"_edit_clear");
                   
            $("#dialogues_"+type+"_edit_confirm").off("click").on("click",async function(){
                if($("#dialogues_"+type+"_edit_input").val()==unedited){
                   $("#dialogues_"+type+"_edit_popup").hide();
                   return;
                }
               //change label and hide
               
                if(type=="receiving"){
                     //change label and hide
                     $("#dialogues_"+type+"_label").text($("#dialogues_"+type+"_edit_input").val());
                     current_line.children(':nth-child(2)').text($("#dialogues_"+type+"_edit_input").val());
                     
                    var res=await window.electron.ipcRenderer_invoke("change_receive_address_label",(parseInt(current_line.children(':nth-child(1)').text())-1),$("#dialogues_"+type+"_edit_input").val());
                    if(res=="duplicated"){
                        show_popup_action(templ_loads,"error","Label is duplicated!");
                        return;
                    }                   
                    await window.electron.ipcRenderer_invoke("save_wallet",null);
                }
                if(type=="contacts"){
                    var res=await window.electron.ipcRenderer_invoke("change_contact_address",(parseInt(current_line.children(':nth-child(1)').text())-1),$("#dialogues_"+type+"_edit_input").val());
                    if(res=="duplicated label"){
                        show_popup_action(templ_loads,"error","Label is duplicated!"); 
                        return;
                    }
                    if(res=="duplicated address"){
                      show_popup_action(templ_loads,"error","Address is duplicated!"); 
                      return;
                    } 
                    if(res==false){ show_popup_action(templ_loads,"error","Basic Contacts are immutable!"); return;}
                    //change label and hide
                    $("#dialogues_"+type+"_label").text($("#dialogues_"+type+"_edit_input").val());
                    current_line.children(':nth-child(2)').text($("#dialogues_"+type+"_edit_input").val());
                    await window.electron.ipcRenderer_invoke("save_wallet",null);
                }
//                
                $("#dialogues_"+type+"_edit_popup").hide();
            });
            
            $("#dialogues_"+type+"_edit_cancel").off("click").on("click",async function(){
                $("#dialogues_"+type+"_edit_popup").hide();
            }); 
        });
        
        //remove contact
        $("#dialogues_contacts_delete_popup").toggle();
        $("#dialogues_"+type+"_delete").off('click').on('click',function(){  
            var button_top_pos = $("#dialogues_contacts_delete").position().top;
            $("#dialogues_contacts_delete_popup").css({position: "fixed",top: (button_top_pos - 125),right:"0rem"});
            button_top_pos -= $("#dialogues_contacts_delete_popup").height();       
            $("#dialogues_contacts_delete_popup").toggle();
            
            $("#dialogues_contacts_delete_popup_confirm").off("click").on("click", async function () {
                             
                var res=await window.electron.ipcRenderer_invoke("delete_contact_address",(parseInt(current_line.children(':nth-child(1)').text())-1));
                if(res==false){ show_popup_action(templ_loads,"error","Basic Contacts are immutable!"); return;}
                $('.ui.modal').modal("hide");
                await window.electron.ipcRenderer_invoke("save_wallet",null);
                
                show_popup_action(templ_loads,"info","Contact deleted!");
                var j_clone=await address_book_contacts_pagination();
                $('#address_book_tab_content').html(j_clone);
                address_book_contacts_actions();
            });
        });
        
        
        
        $('.ui.modal').modal({
            duration:300,
            closable: true,
            onDeny: function () {
//                window.alert('Wait not yet!');
                return false;
            },
            onApprove: function () {
//                window.alert('Approved!');
                return false;
            },onVisible:function(){
                //doing custom stuff 
                
                
            },onHidden:function(){                  
                clean_modal(type);
               
            }/*,onHide:function(){
                $("body").css("height","auto");
            }*/
        })
                .modal('show');
       
}

function show_popup_action(templ_loads,type,text,hold_duration){
    
    var popup=$(templ_loads["dialogues"]).filter("#popup_dialogue");
    popup.find("#popup_dialogue_text").html(text);
    popup.hide();
    
    $("#popup_dialogue").remove();  
    $("body").append(popup);
    
     if(type=="error"){
       $("#popup_dialogue").css("background","#ff0000"); 
    }
    
    if(type=="info"){
       $("#popup_dialogue").css("background","#f38320");  
    }
    
    $("#popup_dialogue").transition('slide up',250,function(){
     
      setTimeout(function(){
          $("#popup_dialogue").transition('slide up',250,function(){
            console.log("#popup_dialogue removed");
            $("#popup_dialogue").remove();
          },"easeInOutQuad");
      }, (hold_duration==undefined ? 1000 : hold_duration));
             
    },"easeInOutQuad");
    
}

function input_clear_button_func(input_id, clear_button_id) {
    //clear input
    $(clear_button_id).off('click').on('click', function () {
        $(input_id).val("");
        $(input_id).change();
        $(clear_button_id).hide();
        $(input_id).focus();
    });
    
    //when already filled
    if ($(input_id).val().length > 0) {
        $(clear_button_id).show();
    } else {
        $(clear_button_id).hide();
    }
    
    //on user action
    $(input_id).off("input").on("input", function () {
        $(input_id).change();
        if ($(input_id).val().length > 0) {
            $(clear_button_id).show();
        } else {
            $(clear_button_id).hide();
        }
    });   
}

function show_qr_code(elementID, text) {
    var qrcode = new QRCode(document.getElementById(elementID), {
        text: text,
        width: 256,
        height: 256,
        colorDark: "#382b3f",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.H
    });
    return qrcode;
}

function clean_modal(type) {
    $("#dialogues_" + type).remove();
    $(".ui.modal").remove();
    $("body").removeClass("dimmed");
    $("body").css("margin-right","0px");
    $("body").css("height","auto");
    setTimeout(function(){$("body").css("height","auto");},10);
}


function show_dialogue_modal(templ_loads,title,text,yes_title,no_title,data,yes,no,inside_f){  
        var dialogue=$(templ_loads["dialogues"]).filter("#dialogues_modal");
        $("body").append(dialogue);
       
        
        $("#dialogues_modal_header").text(title);
        $("#dialogues_modal_description").html(text);
        $("#dialogues_modal_yes").text(yes_title);
        $("#dialogues_modal_no").text(no_title);
        
        if(inside_f!=undefined){
            inside_f();           
        }
    
        $('.ui.modal').modal({
            duration:150,
            closable: false,
            onDeny: function () {
//                window.alert('Wait not yet!');
                no(data);
                             
            },
            onApprove: function () {
                yes(data);
//                window.alert('Approved!');
               
            },onVisible:function(){
                //doing custom stuff 
                
                
            },onHidden:function(){
                clean_modal("modal");
               
            }/*,onHide:function(){
                $("body").css("height","auto");
            }*/
        })
                .modal('show');
       
}

 function show_dialogue_info(templ_loads,title,text,ok_title,f,inside_f){  
        var dialogue=$(templ_loads["dialogues"]).filter("#dialogues_info");
        $("body").append(dialogue);
       
        
        $("#dialogues_info_header").text(title);
        $("#dialogues_info_description").html(text);
        $("#dialogues_info_ok").text(ok_title);
        
        $(".dialogue_link").off("click").on("click", async function () {
            var link=$(this).attr("href");
            var conf=window.confirm("Open external link in default browser?");//, "Are you sure you want to open "+link+" in your browser?");
            if(conf){ await window.electron.ipcRenderer_invoke("open_tx_link", link);}          
        });
        
        if(inside_f!=undefined){
            inside_f();           
        }
                
        $('.ui.modal').modal({
            duration:150,
            closable: true,
//            transition:"fade",
            onDeny: function () {
//                window.alert('Wait not yet!');
                
                             
            },
            onApprove: function () {             
//                window.alert('Approved!');
                    setTimeout(function(){f();},300);
                   
               
            },onVisible:function(){
                //doing custom stuff 
                
                
            },onHidden:function(){
                clean_modal("info");
               
            }/*,onHide:function(){
                $("body").css("height","auto");
            }*/
        })
                .modal('show');
       
}

function show_dialogue_input(templ_loads,title,text,input_name,input_type,yes_title,no_title,data,yes,no,more){  
        var dialogue=$(templ_loads["dialogues"]).filter("#dialogues_input");
        $("body").append(dialogue);
       
        
        $("#dialogues_input_header").text(title);
        $("#dialogues_input_description").prepend(text);
        $("#dialogues_input_yes").text(yes_title);
        $("#dialogues_input_no").text(no_title);
        
        $("#dialogues_input_label").text(input_name);
        $("#dialogues_input_input").prop("placeholder", input_name);
        $("#dialogues_input_input").prop("type", input_type);
        
        input_clear_button_func("#dialogues_input_input","#dialogues_input_input_clear");
        
       var append="";
        if(more!= undefined){
            for(var i=0;i<more.length;i++){
                var i_clone=$("#dialogues_input_inputs").clone();             
                i_clone.find("#dialogues_input_label").attr("id","dialogues_input_label"+(i+2)).text(more[i].input_name);
                i_clone.find("#dialogues_input_input").attr("id","dialogues_input_input"+(i+2)).prop("placeholder", more[i].input_name).prop("type", more[i].input_type);
                i_clone.find("#dialogues_input_input_clear").attr("id","dialogues_input_input_clear"+(i+2));
                i_clone.append("<br><br>");
                append+=i_clone.html();                                         
               
            }
             $("#dialogues_input_inputs").append(append);
            for(var i=0;i<more.length;i++){input_clear_button_func("#dialogues_input_input"+(i+2),"#dialogues_input_input_clear"+(i+2));} 
        }
        
        
        $("#dialogues_input_yes").off("click").on("click",async function(){
            yes(data);
        });
        
    
        $('.ui.modal').modal({
            duration:150,
            closable: false,
            onDeny: function () {
//                window.alert('Wait not yet!');
                no(data);
                
            },
            onApprove: async function () {
//                return await yes(data);
//                window.alert('Approved!');
               
            },onVisible:function(){
                //doing custom stuff 
                
                
            },onHidden:function(){                  
                clean_modal("input");
               
            }/*,onHide:function(){
                $("body").css("height","auto");
            }*/
        })
                .modal('show');
       
}

function alias_address_check(address){
    if(address.replace(/[a-km-zA-HJ-NP-Z1-9]/g,"").length>0 || address[0]!="t" || address.length!=34){return false;}
    return true;
}
