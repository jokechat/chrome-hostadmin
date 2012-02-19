var host_file_wrapper = (function(){	
	
	var helper = document.getElementById("host_admin_helper");
	var splitchar = "\n";
	const os = helper.os;

	var file_name;
	if (os == "WINNT"){
		splitchar = "\r\n";
		file_name = helper.where + "\\drivers\\etc\\hosts";
	}else if(os == "Linux"){
		file_name = "/etc/hosts";
	}else if(os == "Darwin"){
		file_name = "/etc/hosts";
	}

	return {
		get : function(){
			return helper.get(file_name);
		}
		,
		set : function(data){
			return helper.set(file_name, data);
		}
		,
		time : function(){
			return helper.time(file_name);
		}
		,
		splitchar : splitchar
	};
})();

var host_admin = (function(){
	const ip_regx = /^((1?\d?\d|(2([0-4]\d|5[0-5])))\.){3}(1?\d?\d|(2([0-4]\d|5[0-5])))$/;

	// copy from http://forums.intermapper.com/viewtopic.php?t=452
	const ip6_regx = /^((([0-9A-Fa-f]{1,4}:){7}([0-9A-Fa-f]{1,4}|:))|(([0-9A-Fa-f]{1,4}:){6}(:[0-9A-Fa-f]{1,4}|((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9A-Fa-f]{1,4}:){5}(((:[0-9A-Fa-f]{1,4}){1,2})|:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9A-Fa-f]{1,4}:){4}(((:[0-9A-Fa-f]{1,4}){1,3})|((:[0-9A-Fa-f]{1,4})?:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){3}(((:[0-9A-Fa-f]{1,4}){1,4})|((:[0-9A-Fa-f]{1,4}){0,2}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){2}(((:[0-9A-Fa-f]{1,4}){1,5})|((:[0-9A-Fa-f]{1,4}){0,3}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){1}(((:[0-9A-Fa-f]{1,4}){1,6})|((:[0-9A-Fa-f]{1,4}){0,4}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(:(((:[0-9A-Fa-f]{1,4}){1,7})|((:[0-9A-Fa-f]{1,4}){0,5}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:)))(%.+)?$/ 

	var lines = [];
	var hosts = {};
	var groups = {};
	
	var loadhost = function() {
	
		lines = [];
		hosts = {};
		groups = {};
		//read
		var host = host_file_wrapper.get();
		
		if (host && host.charAt(host.length - 1) != "\n"){ //fix no lf
			host += host_file_wrapper.splitchar;
		}

		var l_p = 0; //pointer to line
		const regx = /(.*?)\r?\n/mg
		var l = null;
		var group_id = 0;
		var group_c = 0;

		while(l = regx.exec(host)){
			l = l[0];
			
			lines[l_p++] = l;
			
			l = l.replace(/^(\s*#)+/,"#");
			l = l.replace(/#/g," # ");
			l = l.replace(/^\s+|\s+$/g,"");
			l = l.replace(/\s+/g," ");
			
			var tks = l.split(" ");

			if (tks[0] == "#" && tks[1] == "===="){
				if(group_c == 0){
					group_id++;
				}

				if(group_c++ % 2 == 0){
					tks.splice(0,2);
					var group_name = "";
					for(var i in tks){
						group_name += tks[i] + " ";
					}

					if(group_name == ""){
						group_name = "Group " + group_id;
					}

					groups[group_id] = group_name;
				}else{
					group_id++;
				}
				continue;	
			}
						
			var using = true;
			if (tks[0] == "#"){
				using = false;
				tks.splice(0,1);
			}
			
			var ip = "";
			if (ip_regx.test(tks[0]) || ip6_regx.test(tks[0])){
				ip = tks[0];
				tks.splice(0,1);
			}else{
				continue;
			}
			
			var comment = "";

			var names = [];
			var findc = false;
			for (var i in tks){
				if(tks[i] == "#"){
					findc = true;
					continue;
				}
				
				if(findc){
					comment += tks[i] + " ";
				}else{
					names.push(tks[i]);
				}
			}


			ip = {
				addr : ip, 
				using : using ,
				line : l_p - 1,
				comment : comment,
				group : group_id
			};

			for (var i in names){
				var name = names[i];
				if(typeof hosts[name] == "undefined"){
					hosts[name] = [];
				}
			
				hosts[name].push(ip);
			}
		}
	};
	
	var line_enable = function(ip){
		if(!ip.using){
			lines[ip.line] = lines[ip.line].replace(/^(\s*#)+/,"");
		}
		ip.using = true;
	}

	var line_disable = function(ip){
		if(ip.using){
			lines[ip.line] = "#" + lines[ip.line];
		}
		ip.using = false;
	}

	var host_toggle = function(host_name, ip_p){
		if(hosts[host_name]){			
			for (var i in hosts[host_name]){
				var ip = hosts[host_name][i];
				
				if(i == ip_p && !ip.using){
					line_enable(ip);
				}else{
					line_disable(ip);
				}
			}
		}
	}

	var is_group_all_using = function(host_list, gp_p){
		for(var h in host_list){
			for (var i in hosts[host_list[h]]){
				var ip = hosts[host_list[h]][i];
				if(ip.group == gp_p && !ip.using){
					return false;
				}
			}
		}
		return true;
	}

	var group_toggle = function(host_list, gp_p){
		var using = is_group_all_using(host_list, gp_p);
		
		for(var h in host_list){
			for (var i in hosts[host_list[h]]){
				var ip = hosts[host_list[h]][i];
				
				if(ip.group == gp_p){
					if(using){
						line_disable(ip);
					}else{
						line_enable(ip);
					}
				}else if(ip.using){
					line_disable(ip);
				}
			}
		}
	}

	var mk_host = function(){
		var str = "";
		for (var i in lines){
			str += lines[i];
		}
		return str;
	}
	
	var last_modify = 0;
	
	// {{{		
	var refresh = function(){
		var t = host_file_wrapper.time();
		
		if( t != last_modify){
			loadhost();
			last_modify = t;
			
			if(typeof Cc !="undefined"){ // when loading
				var ioService = Components.classes["@mozilla.org/network/io-service;1"].getService(Components.interfaces.nsIIOService);
				try{
					ioService.offline = true;
					var cacheService = Components.classes["@mozilla.org/network/cache-service;1"].getService(Components.interfaces.nsICacheService);
					cacheService.evictEntries(Components.interfaces.nsICache.STORE_ANYWHERE);
				}catch(e){}
				finally{
					ioService.offline = false;
				}
			}
			
			var e = document.createEvent('Events');
			e.initEvent('HostAdminRefresh', false, false);
			document.dispatchEvent(e);

			return true;
		}
		return false;
	}
	// }}}
	
	return {
		get_hosts : function(){
			return hosts;
		},
		get_groups : function(){
			return groups;
		},
		host_toggle : host_toggle,
		group_toggle : group_toggle,
		group_checked : is_group_all_using,
		mk_host : mk_host,
		refresh : refresh
	};
	
})();