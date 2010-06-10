/* Inställningar, jag har valt att köra allt på en separat subbdomän
   Glöm inte att lägga till domänen i /etc/hosts om du behåller inställningarna */
HOST = 'node.localhost';
PORT = 8000;

/* PHP:s motsvarighet till in_array() */
Array.prototype.in_array = function(p_val) {
	for(var i = 0, l = this.length; i < l; i++) {
		if(this[i] == p_val) {
			return true;
		}
	}
	return false;
};

/* Retunerar en unix-time-stamp i sekunder */
function getTimeStamp(){
  return Math.round(new Date().getTime()/1000.0);
}

/* Laddar in alla nödvändliga bibliotek 
   Sys är endast till för debugging
   Den kan anropas genom sys.debug() */
var fu = require("./fu"),
    sys = require("sys"),
    url = require("url"),
    qs = require("querystring");

fu.get("/", fu.staticHandler("index.html"));
fu.get("/client.js", fu.staticHandler("client.js"));
fu.get("/jquery-1.4.2.min.js", fu.staticHandler("jquery-1.4.2.min.js"));
fu.get("/json.js", fu.staticHandler("json.js"));

/* Variabeln kommer att innehålla alla callbacks som ska aktiveras 
   när data finns att skicka ut till användaren */
var callbacks = [];
var channel = new function (){
	/* Skickar ut data till alla användare som är inloggade på servern */
	this.appendMessage = function (data){
		var m = {data: data};
		
		/* Om inga användare finns ansluta så avbryter vi*/
		if(callbacks.length === 0){
			return;
		}
		
    for (var i in callbacks){
			if(callbacks.hasOwnProperty(i)){
				/* Om användaren inte har gjort några inställningar alls, 
				   a.k.a null så hoppar vi vidare, eller om fel data skickas från servern */
				if(callbacks[i].channels == 'null' || callbacks[i].channels === undefined || data.channel === undefined){
					continue;
				}
				
				/* Vi skickar bara ett meddelande till användaren om 
				   personen i fråga har kanalen i sin inställningar */
				if(callbacks[i].channels.in_array(data.channel[0].id)){
					/* Skickar iväg informationen */
					callbacks[i].callback(m);
					
					/* Plockar bort callbacken så att vi inte 
					   skickar samma data flera gånger */
					delete callbacks[i];
				}
			}
		}
  };

	/* Den här sparar callback:en för ansluten användare */
	this.query = function (channels, callback){
		/* Ingående värde från klienten är alltid en sträng med alla cid te.x
		   1,2,3,45,8 
		   Om inte ingående värde är tomt så gör vi om det till en array */
		if(channels){
		  
		  /* Om channels-variabeln bara innehåller ett id så fungerar inte split */
		  try{
		    channels = channels.split(',');
		  }
		  catch(e){
		    channels = [channels];
		  }
		}
		callbacks.push({ callback: callback, time: getTimeStamp(), channels: channels});
  };
};

/* Lite då och då måste vi kontrollera att callback:en vi 
   har sparade i callbacks-variabeln inte är för gamla
   Alla sessions som är äldre än 25 sekunder plockas bort 
   Kontrollen görs var annan sekund */
var check_users = function(){
	for (var i in callbacks){
		if(callbacks.hasOwnProperty(i)){
			if(getTimeStamp() - 25 >= callbacks[i].time){
				
				/* Vi svarar användaren med att 25 sekunder har gått */
				callbacks[i].callback({data: 'timeout'});
				
				/* Sedan låter vi användaren ansluta igen genom att 
				   vi plockar bort nuvarande callback */
				delete callbacks[i];
			}
		}
	}
	setTimeout(check_users,2000);
};

check_users();
fu.listen(PORT, HOST);

/* Det är denna URL som användaren ligger och väntar på data i från 
   Inga ingående argument behövs från användaren 
   då alla användare tar emot samma data... */
fu.get("/receive", function(req, res){
	var channels = qs.parse(url.parse(req.url).query).channels;
	
	channel.query(channels,function (data){
		res.simpleJSON(200, { messages: data });
	});
});

/* Tar emot data från vår server, användaren ska alltså inte komma åt denna funktionen 
   Någon slags lösenord borde kanske skickas med, men de kan fixas vid senare tillfälle */
fu.get("/send", function (req, res) {
	/* Tar in en sträng i form av en stringifierad JSON-sträng */
	try{
		var data = qs.parse(url.parse(req.url).query).data;
	}
	catch(e){
		sys.debug('Fel 1');
		sys.debug(e)
		sys.debug(data)
		res.simpleJSON(200, { status: "ERROR" });
		return;
	}
	
	/* Vi testar att konvertera strängen till ett objekt */
	try{
		data = eval("(" + data + ")");
	}
	catch(e){
		sys.debug("Fel indata");
		sys.debug(data);
		sys.debug(e);
		res.simpleJSON(200, { status: "ERROR" });
		return;
	}
	
	/* Skickar ut datan till användaren */
	channel.appendMessage(data);
	
	/* Svarar servern med valfri information,
	   Då ingen kommer läsa informationen så kan vi lika 
	   gärna skicka med minimalt med information */
	res.simpleJSON(200, { status: "OK" }, 'send');
});
