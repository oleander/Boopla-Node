$.extend({
  getUrlVars: function(){
    var vars = [], hash;
    var hashes = window.location.href.slice(window.location.href.indexOf('?') + 1).split('&');
    for(var i = 0; i < hashes.length; i++)
    {
      hash = hashes[i].split('=');
      vars.push(hash[0]);
      vars[hash[0]] = hash[1];
    }
    return vars;
  },
  getUrlVar: function(name){
    return $.getUrlVars()[name];
  }
});

var channels = $.getUrlVar('channels');

/* Hämtar hem angiven länk och kickar igång angivet callback */
function receive(){
  $.ajax({
		type: 'GET',
		data: {channels: channels},
    url: "/receive",
		dataType: 'json',
    success: function(data){
		
		receive();
		}
  });
}

$('body',top.document).html('apa')
$(document).ready(function()
{
  /* Startar i gång all */
  receive();

});