var event_reg=[];

async function my_invoke(f_name, ...params){

for(var i=0,len=event_reg.length;i<len;i++){
	if(event_reg[i].name==f_name){
		return event_reg[i].func(...params);
		}
	}
throw ("Handle '"+f_name+"' is not registered!");

}

function my_handle(event_name,a_func){
    
for(var i=0,len=event_reg.length;i<len;i++){
	if(event_reg[i].name==event_name){
		throw ("Handle '"+event_name+"' is already registered!");
                return;
		}
}    

var reg={};
reg.name=event_name;
reg.func=a_func;
event_reg.push(reg);
	
}

my_handle("test",async (a,b) => {
    const delay = ms => new Promise(res => setTimeout(res, ms))
    await delay(2000)
    return (a*b);   
});



async function main(){
var res=await my_invoke("test",5,12);
console.log(res);

//var res=await my_invoke("test2",5,12);
//console.log(res);
}
main();
