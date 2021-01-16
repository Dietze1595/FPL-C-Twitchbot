//            ​/leaderboards​/hubs​/{hub_id}​/seasons​/{season}    --> HUBID = b35176d9-6022-47fa-938e-2be7541c8bac    Season = 41
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
  client.action(config.channel, `Hey, I'll be with you over the coming weekend and wish ${config.faceitUsername} the best of luck at his qualifier. If you have any questions about his ranking, stats or infos of his last played match, you can use the following commands: !fplc !rank !stats !last`);
});


client.on("chat", (channel, userstate, commandMessage, self) => {
	if(userstate["display-name"] != config.username){
		switch(commandMessage.split(" ")[0]){
			case '!fpl':
			case '!info':
			case '!fplc':
			case '!fpl-c':
				client.action(channel, `@` + userstate["display-name"] + ` This ladder is played on both Saturday and Sunday from 12:00 - 20:00 pm CET | Info: http://bit.ly/fplc-info | Leaderboard: http://bit.ly/fplc-leaderboard-41`);
				break;
			case '!rank':
			case '!leaderboard':
				if (commandMessage.split(" ")[1] == undefined){
					Faceitname = config.faceitUsername;
					User = userstate["display-name"];
				} else if(commandMessage.split(" ")[1].includes("@")) {
					User = commandMessage.split(" ")[1].replace('@','');
					Faceitname = config.faceitUsername;
				} else {
					User = userstate["display-name"];
					Faceitname = commandMessage.split(" ")[1];
				}					
				getFaceit(0,50, channel, User, Faceitname);
				getFaceit(50,50, channel, User, Faceitname);
				getFaceit(100,50, channel, User, Faceitname);
				break;
			case '!stats':
				getStats(channel, userstate["display-name"]);
				break;
			case '!last':
				getlast(channel, userstate["display-name"]);
				break;
			case '!cmd':
			case '!command':
			case '!commands':
				client.action(channel, `@` + userstate["display-name"] + ` you can use the following Faceit FPL-C commands: !fplc !rank <Faceitname> !stats !last`);
				break;
			default:
			  /*if(commandMessage.includes("rank") || commandMessage.includes("platz")|| commandMessage.includes("stats")){
				getFaceit(0,50, channel, userstate["display-name"]);
				getFaceit(51,100, channel, userstate["display-name"]);
			  }*/
		}
	}  
});

async function getStats(chan, user) {
  await axios
    .get(
      "https://api.faceit.com/stats/v1/stats/time/users/" + config.faceitid + "/games/csgo",
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


async function getlast(chan, user) {
    await axios.get(
		'https://api.faceit.com/stats/v1/stats/time/users/' + config.faceitid + '/games/csgo?size=1', {
	})
	.then(response => {
		if (response.status !== 200) {
			isNull = true;
		} else {
			last = response.data[0];
			if(user == "everyone" && last.matchId == lastmatchid) return;
			lastmatchid = last.matchId
			var won = (last.teamId == last.i2) ? "won" : "lost";
			client.action(chan, `@` + user + ` JDC ${won} last map on ${last.i1} with a score of ${last.i18}. Stats: Kills: ${last.i6} - Assists: ${last.i7} - Deaths: ${last.i8} - HS%: ${last.c4}%`);
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
			response.data.items.forEach((player) => {
				if (player.player.nickname == name)
				{
					client.action(chan, `@` + user + ` ${name} current rank is ${player.position} - Streak: ${player.current_streak} - Won: ${player.won} - Lost: ${player.lost} | Leaderboard: http://bit.ly/fplc-leaderboard-41`);
				}
			})
		}
	})
	.catch(function (error) {});
}
