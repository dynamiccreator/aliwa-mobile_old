//var EC = require("elliptic").ec;

    get_DER_sig = function (hash, priv_key) {
        var ec = new EC("secp256k1");
        var mySign = ec.sign(Buffer.from(hash, "hex"), Buffer.from(priv_key, "hex"), {canonical: true});
        var sig = mySign.toDER();

        var DER_sig = "";
        for (var si = 0; si < sig.length; si++) {
            var si_int = sig[si]
            DER_sig += zehn_l(si_int.toString(16));
        }
        //    console.log(DER_sig)  
        return DER_sig;
    }

    zehn_l = function (z) {
        if (z.length < 2) {
            z = "0" + z;
        }
        return z;
    }

    hex_length_norm = function (hex, len) {
        if (hex.length < len) {
            var lead = "";
            for (var i = 0; i < len - hex.length; i++)
            {
                lead += "0";
            }
            {
                return lead + hex;
            }
        }
        return hex;
    }

    reverse_hex = function (hex) {
        var out = "";
        for (var i = hex.length - 1; i > 0; i -= 2) {
            out += hex[i - 1] + hex[i];
        }
        return out;
    }


    hexStringToByte = function (str) {
        if (!str) {
            return new Uint8Array();
        }

        var a = [];
        for (var i = 0, len = str.length; i < len; i += 2) {
            a.push(parseInt(str.substr(i, 2), 16));
        }

        return new Uint8Array(a);
    }

    int_toVarint8_fd = function (int) {
        if (int <= 252) {// fc
            return zehn_l(int.toString("16"));
        }

        if (int <= 65535) {
            var Bi = hex_length_norm(int.toString("16"), 4);
            return "fd" + reverse_hex(Bi);
        }

        if (int <= (Math.pow(16, 8) - 1)) {
            var Bi = hex_length_norm(int.toString("16"), 8);
            return "fe" + reverse_hex(Bi);
        }

        if (int <= (Math.pow(16, 16) - 1)) {
            var Bi = hex_length_norm(int.toString("16"), 16);
            return "ff" + reverse_hex(Bi);
        }

        return false;

    }

    int_toVarint_byte = function (int, bytes) {

        var Bi = hex_length_norm(int.toString("16"), bytes * 2);
        return reverse_hex(Bi);

    }

    ascii_string_to_hex = function (string) {
        var out = "";
        for (var i = 0; i < string.length; i++) {
            out += int_toVarint_byte(string.charCodeAt(i), 1);
        }
        return out;
    }

    hex_to_ascii = function (hex) {
        var out = "";
        for (var i = 0; i < hex.length; i += 2) {
            var byte = hex[i] + hex[i + 1];
            out += String.fromCharCode(parseInt(byte, 16));
        }
        return out;
    }

    hex_to_int_arr = function (hex) {
        var out = [];
        for (var i = 0; i < hex.length; i += 2) {
            var byte = hex[i] + hex[i + 1];
            out[out.length] = parseInt(byte, 16);
        }
        return out;
    }
    
    intArray_to_hex_string = function(intArr){
        var out="";
        for(var i=0;i<intArr.length;i++){
          out+=  int_toVarint_byte(intArr[i],1);        
        }
        return out;
    }
    
    shuffleArray = function (array) {
        var my_number_array = new Uint32Array(1);            
        for (var i = array.length - 1; i > 0; i--) {
            var j = Math.floor((crypto.getRandomValues(my_number_array) / 4294967295) * (i + 1));
            var temp = array[i];
            array[i] = array[j];
            array[j] = temp;
        }
}
