require("./helper_functions")();
class wallet_functions {  
    constructor() {          
    }

    get_new_seed_words() {
//        var alias_12 = "";
//        for (var i = 0; i < 12; i++) {
//            alias_12 += " alias";
//        }
        return bip39.generateMnemonic(256);// + alias_12;
    }

    async get_master_seed_string(seed_words, pw) {
        const seed = await bip39.mnemonicToSeed(seed_words, pw); //creates seed buffer
//        const root = hdkey.fromMasterSeed(seed);
//        console.log("SEED: ");
//        console.log(seed);
//        console.log(seed.toString("hex"));
//        console.log(new Buffer(seed.toString("hex"),"hex"));
        return seed.toString("hex");
    }

    get_derived_adresses(seed, change, from, to) {
        var root=hdkey.fromMasterSeed(Buffer.from(seed,"hex"));
        var addresses = [];

        for (var i = from; i < to; i++) {

            const addrnode = root.derive("m/44'/213'/0'/" + change + "/" + i);

//            console.log(i + ". private: " + addrnode.privateKey.toString('hex'));
//            console.log(i + ". public: " + addrnode._publicKey.toString('hex'));

            const step1 = addrnode._publicKey;

            const step2 = createHash('sha256').update(step1).digest();
            const step3 = createHash('ripemd160').update(step2).digest();
            var step4 = Buffer.allocUnsafe(21);
            step4.writeUInt8(0x3f, 0);
            step3.copy(step4, 1); //step4 now holds the extended RIPMD-160 result
            const step9 = bs58check.encode(step4);
//            console.log(i + '. Adress: ' + step9 + " | " + step9.length);

            addresses.push({pos: i, type: change,address: step9.toString(), privateKey: addrnode.privateKey.toString('hex'), publicKey: addrnode._publicKey.toString('hex')});
        }
        return addresses;
    }

    build_hex_transaction(tx_input_data)
    {

//count narrations
        var narr_count = 0;
        for (var n = 0; n < tx_input_data.outputs.length; n++) {
            if (tx_input_data.outputs[n].narration != undefined) {
                narr_count++;
            }
        }

//build outputs first because of reuse for signatures
        var output_hex = "" + int_toVarint8_fd(tx_input_data.outputs.length + narr_count); // output num

        for (var o = 0; o < tx_input_data.outputs.length; o++) {
            output_hex += int_toVarint_byte(Math.floor(numeral(tx_input_data.outputs[o].amount).multiply(100000000).value()), 8); // Math.floor because of javascript adding some 0.000000000001 at the end after multiplying 
            output_hex += int_toVarint_byte(25, 1);// script length  
            output_hex += "76a914" + bs58_2.decode(tx_input_data.outputs[o].destination_address).toString("hex").substr(2, 40) + "88ac";//output script            
            //build narration if available
            if (tx_input_data.outputs[o].narration != undefined) {
//                console.log("narration:\n");
                var nar_hex = ascii_string_to_hex(tx_input_data.outputs[o].narration);

                output_hex += int_toVarint_byte(0, 8); // zero value

                var narr_script = "6a" + "026e70" + "6a" + int_toVarint_byte((nar_hex.length / 2), 1) + nar_hex;
                output_hex += int_toVarint_byte(narr_script.length / 2, 1);
                output_hex += "6a" + "026e70" + "6a" + int_toVarint_byte((nar_hex.length / 2), 1) + nar_hex;
            }

        }

        output_hex += "00000000"; //locktime

        var output_hex_for_sign = output_hex + "01000000"; // add hashcode type
//        console.log("output_hex_for_sign:" + output_hex_for_sign + "\n");

//build signatures
        var alias_utc_hex = int_toVarint_byte((Math.floor(Date.now() / 1000) - 180), 4);
        var input_head = "01000000" + alias_utc_hex;
        input_head += int_toVarint8_fd(tx_input_data.inputs.length); //input num


        var signatures = [];
        for (var i = 0; i < tx_input_data.inputs.length; i++) {

            var prepare_sig = input_head; // head is the same for all


            for (var j = 0; j < tx_input_data.inputs.length; j++) {
                prepare_sig += reverse_hex(tx_input_data.inputs[j].prev_tx); // prev tx
                prepare_sig += int_toVarint_byte(tx_input_data.inputs[j].input_index, 4); // output index -> new input index

                // only sign itself not other tx inputs
                if (i == j) {
                    prepare_sig += int_toVarint_byte((parseInt(Math.floor(tx_input_data.inputs[j].script_pubkey.length/2))), 1); // length of script_pubkey
                    prepare_sig += tx_input_data.inputs[j].script_pubkey;   // script_pubkey                       
                } else {
                    prepare_sig += "00";// nothing to sign 
                }

                prepare_sig += "ffffffff";//sequence     
            }

            prepare_sig += output_hex_for_sign; //complete transaction for sign i-th input
//            console.log("prepare_sig:" + prepare_sig + "\n");

            prepare_sig += int_toVarint_byte(4, 4) // ALIAS FORK ID !!!!!!!!!!!!!!

            //double hash sha256 
            var prepare_hash = createHash('sha256').update(Buffer.from(prepare_sig, "hex")).digest(); // first hash
            prepare_hash = (createHash('sha256').update(prepare_hash).digest()).toString("hex"); // double hash -> to string



            var pure_sig = get_DER_sig(prepare_hash, tx_input_data.inputs[i].private_key);
            // length of signature,signature,hashcode type,public key length,public key
            signatures[signatures.length] = int_toVarint_byte((pure_sig.length / 2) + 1, 1) + pure_sig + "01" + int_toVarint_byte((tx_input_data.inputs[i].public_key.length / 2), 1) + tx_input_data.inputs[i].public_key;
        }

//put everything together to get the final raw transaction
        var final_raw_tx = input_head;
//        console.log("input_head: " + input_head + "\n");

        for (var i = 0; i < tx_input_data.inputs.length; i++) {

            final_raw_tx += reverse_hex(tx_input_data.inputs[i].prev_tx); // prev tx
            final_raw_tx += int_toVarint_byte(tx_input_data.inputs[i].input_index, 4); // output index -> new input index

            final_raw_tx += int_toVarint_byte(signatures[i].length / 2, 1); // length of ( signature + public key + codes + lengthbytes)
            final_raw_tx += signatures[i];   // length of signature,signature,hashcode type,public key length,public key         

            final_raw_tx += "ffffffff";//sequence 

//            console.log("after " + i + "th tx: " + final_raw_tx + "\n");
        }

        final_raw_tx += output_hex;

        return final_raw_tx;
    }

//    wallet_hash(string) {
//        var hash=createHash('sha256').update(Buffer.from(string, "hex")).digest();       
//       return  createHash('sha256').update(hash).digest().toString("hex");  
//    }

   
}

exports.wallet_functions = wallet_functions;