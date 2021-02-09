const tmi = require("tmi.js");
var axios = require('axios');
const fs = require("fs"); 

const config = JSON.parse(fs.readFileSync("cfg.json"));

var Players, lastmatchid;

let client = new tmi.Client({
    identity: {
		username: config.username,
		password: config.password
    },
    
	channels: config.channel,
    options: {
        debug: false
    },
    connection: {
        reconnect: true,
        secure: true
    }
});

client.connect();

client.on("connected", (address, port) => {
  console.log(`Connected to ${address}:${port}`);
  config.channel.forEach((streamer, index) => {
	  client.action(streamer, `Hey, I'll be with you over the coming weekend and wish ${config.faceitUsername[index]} the best of luck at his qualifier. If you have any questions about his ranking, stats or infos of his last played match, you can use the following commands: !fplc !rank !stats !last`);
	})
});


client.on("chat", (channel, userstate, commandMessage, self) => {
	if(userstate["display-name"] != config.username){
		User = userstate["display-name"]

		config.channel.forEach((streamer, index) => {
			if(channel == streamer){
				faceitUsername = config.faceitUsername[index];
				faceitid = config.faceitid[index];
			}
		}); 
		if(commandMessage.split(" ")[1] != undefined && commandMessage.split(" ")[1].includes("@")) User = commandMessage.split(" ")[1].replace('@','');

		switch(commandMessage.split(" ")[0]){
			case '!feedback':
				client.action(channel, `@` + User + ` If you have any suggestions or bug reports - please send me a Steammessage: http://steamcommunity.com/id/Dietze_`);
				break;
			case '!fpl':
			case '!info':
			case '!fplc':
			case '!fpl-c':
				client.action(channel, `@` + User + ` The FPL-Challenger will serve as a way for upcoming talent to compete with like-minded players for their next step in Counter-Strike | Info: http://bit.ly/FPLC-Info | Leaderboard: http://bit.ly/FPL-C-43`);
				break;
			case '!rank':
			case '!leaderboard':
				if (commandMessage.split(" ")[1] == undefined || commandMessage.split(" ")[1].includes("@")){
					Faceitname = faceitUsername;
				} else {
					Faceitname = commandMessage.split(" ")[1];
				}					
				getFaceit(0,50, channel, User, Faceitname);
				getFaceit(50,50, channel, User, Faceitname);
				getFaceit(100,50, channel, User, Faceitname);
				break;
			case '!stats':
				getStats(channel, User, faceitid);
				break;
			case '!last':
				getlast(channel, User, faceitid, faceitUsername);
				break;
			case '!cmd':
			case '!command':
			case '!commands':
				client.action(channel, `@` + User + ` you can use the following Faceit FPL-C commands: !fplc !rank <Faceitname> !stats !last !feedback`);
				break;
			default:
			  /*if(commandMessage.includes("rank") || commandMessage.includes("platz")|| commandMessage.includes("stats")){
				getFaceit(0,50, channel, userstate["display-name"]);
				getFaceit(51,100, channel, userstate["display-name"]);
			  }*/
		}
	}  
});

async function getStats(chan, user, idStats) {
  await axios
    .get(
      "https://api.faceit.com/stats/v1/stats/time/users/" + idStats + "/games/csgo",
    )
    .then(response => {
      if (response.status !== 200) {
        var isNull = true;
      } else {  
        length = 20;
        var test = response.data;
        if (test.length == 0)
			    return;
        
        if (test.length <=20){
          length = test.length;
        }
        var kills = 0, avgKills= 0, HS = 0, avgHs = 0,  divid = 0, KD = 0, avgKD = 0, KR = 0, avgKR = 0;
        for (var i = 0; i < length; i++) {
          if (test[i].gameMode !== '5v5') {
            length = length + 1;
          } else {
            divid = divid + 1;
            kills = parseInt(test[i].i6) + kills;
            HS = parseInt(test[i].c4 * 100) + HS;
            KD = parseInt(test[i].c2 * 100) + KD;
            KR = parseInt(test[i].c3 * 100) + KR;
          }
        }
        avgKills = Math.round(kills / divid);
        avgHs = Math.round(HS / divid / 100);
        avgKD = (KD / divid / 100).toFixed(2);
        avgKR = (KR / divid / 100).toFixed(2);
      
        client.action(
          chan,
          `@` + user + ` Here are the stats of the last ${divid} matches: Avg. Kills: ${avgKills} - Avg. HS%: ${avgHs}% - Avg. K/D: ${avgKD} - Avg. K/R: ${avgKR}`);
      }
    })
    .catch(function(error) {});
}


async function getlast(chan, user, idLast, userLast) {
    await axios.get(
		'https://api.faceit.com/stats/v1/stats/time/users/' + idLast + '/games/csgo?size=1', {
	})
	.then(response => {
		if (response.status !== 200) {
			isNull = true;
		} else {
			last = response.data[0];
			lastmatchid = last.matchId
			var won = (last.teamId == last.i2) ? "won" : "lost";
			client.action(chan, `@` + user + ` ${userLast} ${won} last map on ${last.i1} with a score of ${last.i18}. Stats: Kills: ${last.i6} - Assists: ${last.i7} - Deaths: ${last.i8} - HS%: ${last.c4}%`);
		}
	})
	.catch(function (error) {});
}

async function getFaceit(x, y, chan, user, name) {
    await axios.get('https://open.faceit.com/data/v4/leaderboards/' + config.faceitleaderboardid + '?offset=' + x + '&limit=' + y, {
        headers: {
            'Authorization': 'Bearer ' + config.faceittoken
		}
	})
	.then(response => {
		if (response.status !== 200) {
			isNull = true;
		} else {
			if(response.data.leaderboard.status == 'UPCOMING'){
				client.action(chan, `@` + user + ` There is no leaderboard at the moment. The FPL-Challenger EU Qualifiers December Edition 2020 starts, Sat. 16 Jan 2021, 12:00 CET`);
			}else{
				response.data.items.forEach((player) => {
					if (player.player.nickname == name)
					{
						client.action(chan, `@` + user + ` ${name} current rank is ${player.position} - Streak: ${player.current_streak} - Won: ${player.won} - Lost: ${player.lost} | Leaderboard: http://bit.ly/FPL-C-43`);
					}
				})
			}
		}
	})
	.catch(function (error) {});
}
