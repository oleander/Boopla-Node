/* Inställningar, jag har valt att köra allt på en separat subbdomän
   Glöm inte att lägga till domänen i /etc/hosts om du behåller inställningarna */
HOST = 'node.localhost';
PORT = 8000;

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

/* Variabeln kommer att innehålla alla callbacks som ska aktiveras 
   när data finns att skicka ut till användaren */
var callbacks = [];
var channel = new function (){
	/* Skickar ut data till alla användare som är inloggade på servern */
	this.appendMessage = function (data){
		var m = {data: data};
    for (var i in callbacks){
			if(callbacks.hasOwnProperty(i)){
				/* Skickar iväg informationen */
				callbacks[i].callback(m);
				
				/* Plockar bort callbacken så att vi inte 
				   skickar samma data flera gånger */
				delete callbacks[i];
			}
		}
  };

	/* Den här sparar callback:en för ansluten användare */
	this.query = function (callback){
		callbacks.push({ callback: callback, time: getTimeStamp() });
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
	channel.query(function (data){
		res.simpleJSON(200, { messages: data }, "receive");
	});
});

/* Tar emot data från vår server, användaren ska alltså inte komma åt denna funktionen 
   Någon slags lösenord borde kanske skickas med, men de kan fixas vid senare tillfälle */
fu.get("/send", function (req, res) {
	/* Tar in en sträng i form av en stringifierad JSON-sträng */
	var data = qs.parse(url.parse(req.url).query).data;
	
	/* Skickar ut datan till användaren */
	channel.appendMessage(eval(data));
	
	/* Svarar servern med valfri information,
	   Då ingen kommer läsa informationen så kan vi lika 
	   gärna skicka med minimalt med information */
	res.simpleJSON(200, { status: "OK" }, 'send');
});
