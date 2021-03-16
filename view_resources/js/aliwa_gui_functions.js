function show_dialogue_address(current_line,templ_loads,type){
        console.log("line clicked");
        var dialogue=$(templ_loads["dialogues"]).filter("#dialogues_"+type);
        $("body").append(dialogue);
        show_qr_code("modal_qr_code",current_line.children(':nth-child(3)').text());
        var title_text=(type=="contacts" ? "Contact Address - " : "Receiving Address - HD #");
        $("#dialogues_"+type+"_header").text(title_text+current_line.children(':nth-child(1)').text());
        $("#dialogues_"+type+"_address").text(current_line.children(':nth-child(3)').text());
        $("#dialogues_"+type+"_label").text(current_line.children(':nth-child(2)').text());
        
        
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
        
        //delete
         $("#dialogues_"+type+"_delete").off("click").on("click",function(){
            
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
            
            input_clear_button_func("#dialogues_"+type+"_edit_input", "#dialogues_"+type+"_edit_clear");
                   
            $("#dialogues_"+type+"_edit_confirm").off("click").on("click",function(){
               //change label and hide
                $("#dialogues_"+type+"_edit_popup").hide();
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
}

function clean_modal(type) {
    $("#dialogues_" + type).remove();
    $(".ui.modal").remove();
    $("body").removeClass("dimmed");
    $("body").css("margin-right","0px");
    $("body").css("height","auto");
    setTimeout(function(){$("body").css("height","auto");},10);
}


function show_dialogue_modal(templ_loads,title,text,yes_title,no_title,data,yes,no){  
        var dialogue=$(templ_loads["dialogues"]).filter("#dialogues_modal");
        $("body").append(dialogue);
       
        
        $("#dialogues_modal_header").text(title);
        $("#dialogues_modal_description").html(text);
        $("#dialogues_modal_yes").text(yes_title);
        $("#dialogues_modal_no").text(no_title);
        
        
    
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

function show_dialogue_info(templ_loads,title,text,ok_title,f){  
        var dialogue=$(templ_loads["dialogues"]).filter("#dialogues_info");
        $("body").append(dialogue);
       
        
        $("#dialogues_info_header").text(title);
        $("#dialogues_info_description").html(text);
        $("#dialogues_info_ok").text(ok_title);
        
        
        
    
        $('.ui.modal').modal({
            duration:150,
            closable: true,
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

function show_dialogue_input(templ_loads,title,text,input_name,input_type,yes_title,no_title,data,yes,no){  
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
