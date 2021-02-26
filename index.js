const tmi = require("tmi.js");
var axios = require('axios');
const fs = require("fs"); 

const config = JSON.parse(fs.readFileSync("cfg.json"));

var Players, lastmatchid, played, inList;

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
  getMonthsPassed();
  getLeaderboardId(config.HubId, getMonthsPassed("monthDifference"))

  console.log(`Connected to ${address}:${port}`);
  config.channel.forEach((streamer, index) => {
	  client.action(streamer, `Bot successfully added. Please use !commands`);
	})
});


function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}


const getMonthsPassed = () => {
    const startDate = new Date(2017, 06, 01); // month start at 0
    const currentDate = new Date();
    const monthDifference =
      (currentDate.getFullYear() - startDate.getFullYear()) * 12 +
      (currentDate.getMonth() - startDate.getMonth());
    return monthDifference;
};

async function getLeaderboardId(Hub, Season) {
    await axios.get(
		'https://open.faceit.com/data/v4/leaderboards/hubs/' + Hub + '/seasons/' + Season, {
        headers: {
            'Authorization': 'Bearer ' + config.faceittoken
		}
	})
	.then(response => {
		if (response.status !== 200) {
			isNull = true;
		} else {
			leaderboardId = response.data.leaderboard.leaderboard_id;
		}
	})
	.catch(function (error) {});
}



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
			case '!newmonth':
				if(userstate["user-type"] === 'mod' || userstate["display-name"].toLowerCase() == channel.replace('#','')){
					getMonthsPassed();
					client.action(channel, `Neuer Monat in der FPL-C Season. Season: ${getMonthsPassed("monthDifference")}`);
					getLeaderboardId(config.HubId, getMonthsPassed("monthDifference"))
				}else{
					client.action(channel, `@` + User + ` You are not a mod`);
				}
				break;
			case '!feedback':
				client.action(channel, `@` + User + ` If you have any suggestions or bug reports - please send me a Steammessage: http://steamcommunity.com/id/Dietze_`);
				break;
			case '!fpl':
			case '!info':
			case '!fpl-c':
			case '!fplc':
				client.action(channel, `The FPL-Challenger will serve as a way for upcoming talent to compete with like-minded players for their next step in Counter-Strike | Info: http://bit.ly/FPLC-Info`);
				break;
			case '!rank':
			case '!leaderboard':
				played = 0;
				if (commandMessage.split(" ")[1] == undefined || commandMessage.split(" ")[1].includes("@")){
					Faceitname = faceitUsername;
				} else {
					Faceitname = commandMessage.split(" ")[1];
				}
				getFaceit(0,50, channel, User, Faceitname);
				getFaceit(50,50, channel, User, Faceitname);
				getFaceit(100,50, channel, User, Faceitname);
				sleep(5000).then(() => { if(played == 0)client.action(channel, `${Faceitname} didn't played a game yet`); }); 
				break;
			case '!stats':
				getStats20(channel, User, faceitid);
				break;
			case '!fplcstats':
				inList = 0;
				if (commandMessage.split(" ")[1] == undefined || commandMessage.split(" ")[1].includes("@")){
					Faceitname = faceitUsername;
				} else {
					Faceitname = commandMessage.split(" ")[1];
				}	
				getStats(0,100, channel, User, Faceitname);
				getStats(100,100, channel, User, Faceitname);
				getStats(200,100, channel, User, Faceitname);
				getStats(300,100, channel, User, Faceitname);
				getStats(400,100, channel, User, Faceitname);
				getStats(500,100, channel, User, Faceitname);
				break;

			case '!last':
				getlast(channel, User, faceitid, faceitUsername);
				break;
			case '!cmd':
			case '!command':
			case '!commands':
				client.action(channel, `@` + User + ` you can use the following Faceit FPL-C commands: !rank !stats !fplcstats !last !newmonth !feedback`);
				break;
			default:
			  	break;
		}
	}  
});




async function getStats(x, y, chan, user, name) {
    await axios.get('https://open.faceit.com/data/v4/hubs/' + config.HubId + '/stats?offset=' + x + '&limit=' + y, {
        headers: {
            'Authorization': 'Bearer ' + config.faceittoken
		}
	})
	.then(response => {
		if (response.status !== 200) {
			isNull = true;
		} else {
			response.data.players.forEach((player, index) => {
				if (player.nickname == name)
				{
					inList = 1;
					client.action(chan, `Here are the FPLC stats from ${name}: Avg. Kills: ${player.stats["Average Kills"]} - Avg. HS%: ${player.stats["Average Headshots %"]}% - Avg. K/D: ${player.stats["Average K/D Ratio"]} - Win Rate: ${player.stats["Win Rate %"]}`);
				}
			})
		}
	})
	.catch(function (error) {});
}




async function getStats20(chan, user, idStats) {
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
          `Here are the stats of the last ${divid} matches: Avg. Kills: ${avgKills} - Avg. HS%: ${avgHs}% - Avg. K/D: ${avgKD} - Avg. K/R: ${avgKR}`);
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
			client.action(chan, `${userLast} ${won} last map on ${last.i1} with a score of ${last.i18}. Stats: Kills: ${last.i6} - Assists: ${last.i7} - Deaths: ${last.i8} - HS%: ${last.c4}%`);
		}
	})
	.catch(function (error) {});
}

async function getFaceit(x, y, chan, user, name) {
    await axios.get('https://open.faceit.com/data/v4/leaderboards/' + leaderboardId + '?offset=' + x + '&limit=' + y, {
        headers: {
            'Authorization': 'Bearer ' + config.faceittoken
		}
	})
	.then(response => {
		if (response.status !== 200) {
			isNull = true;
		} else {
			if(response.data.leaderboard.status == 'UPCOMING'){
				played = 2;
				client.action(chan, `There is no leaderboard at the moment. The FPL-Challenger EU Qualifiers December Edition 2020 starts, Sat. 16 Jan 2021, 12:00 CET`);
			}else{
				response.data.items.forEach((player, index) => {
					if (player.player.nickname == name)
					{
						played = 1;
						if (index <= 1){
							client.action(chan, `${name} current rank is ${player.position} - Streak: ${player.current_streak} - Won: ${player.won} - Lost: ${player.lost} - Points over the 3. place: ${player.points - response.data.items[2].points}`);
						} else {
							client.action(chan, `${name} current rank is ${player.position} - Streak: ${player.current_streak} - Won: ${player.won} - Lost: ${player.lost} - Points needed for 2. place: ${response.data.items[1].points - player.points}`);
						}
					}
				})
			}
		}
	})
	.catch(function (error) {});
}
