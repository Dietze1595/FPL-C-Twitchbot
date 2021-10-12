const tmi = require("tmi.js");
var axios = require('axios');
const fs = require("fs"); 
const { Console } = require("console");

const config = JSON.parse(fs.readFileSync("cfg.json"));

var Players, lastmatchid, played, inList, secondplayer, secondelo, Identifikation, faceitlvl, faceitelo, month;

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
  month = getMonthsPassed();
  getLeaderboardId(config.HubId, month)

  console.log(`Connected to ${address}:${port}`);
  config.channel.forEach((streamer, index) => {
	  //client.action(streamer, `Hey, I'll be with you over the coming weekend and wish ${config.faceitUsername[index]} the best of luck at his qualifier. If you have any questions about his ranking, stats or infos of his last played match, you can use the following commands: !fplc !rank !stats !last`);
	})
});

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const talkedRecently = new Set();

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




async function trySwitch(channel, userstate, User, Faceitname, status) {
    switch(status) {
		case '!newmonth':
			if(userstate["user-type"] === 'mod' || userstate["display-name"].toLowerCase() == channel.replace('#','')  || userstate["display-name"] == "Dietze_"){
				month = getMonthsPassed();
				client.action(channel, `New FPL-C. Season: ${month}`);
				getLeaderboardId(config.HubId, month)
			}else{
				client.action(channel, `@` + User + ` Mod only command`);
			}
			break;
		case '!feedback':
			client.action(channel, `@` + User + ` If you have any suggestions or bug reports - please send me a Steammessage: http://steamcommunity.com/id/Dietze_`);
			break;
		case '!live':
			await getFaceitId(Faceitname);
			await getLiveMatch(channel, Faceitname, Identifikation);
			break;
		case '!fpl':
		case '!info':
		case '!fpl-c':
			client.action(channel, `The FPL-Challenger will serve as a way for upcoming talent to compete with like-minded players for their next step in Counter-Strike | Info: http://bit.ly/FPLCircuit | Leaderboard: http://bit.ly/FPL-C-${month}`);
			break;
		case '!rank':
		case '!fplc':
		case '!leaderboard':
			played = 0;
			for(i = 0; i <= 150; i += 50){				
				await getFaceit(i, 50, channel, User, Faceitname);
			}
			sleep(4000).then(() => { if(played == 0)client.action(channel, `${Faceitname} has not yet played a game in the FPLC.`); }); 
			break;
		case '!stats':
			await getFaceitId(Faceitname);
			await getStats20(channel, User, Identifikation, Faceitname);
			break;
		case '!fplcstats':
			inList = 0;
			for(i = 0; i <= 1000; i += 100){					
				getStats(i,100, channel, User, Faceitname);
			}
			sleep(6000).then(() => { if(inList == 0)client.action(channel, `${Faceitname} has not yet played a game in the FPLC.`); }); 
			break;
		case '!last':
			await getFaceitId(Faceitname);
			await getlast(channel, User, Identifikation, Faceitname);
			break;
		case '!cmd':
		case '!command':
		case '!commands':
			client.action(channel, `@` + User + ` you can use the following Faceit commands: !stats <name> !last <name> !live <name> || FPL-C Commands: !rank <name> !fplcstats <name> !feedback`);
			break;
		default:
			  /*if(commandMessage.includes("rank") || commandMessage.includes("platz")|| commandMessage.includes("stats")){
				getFaceit(0,50, channel, userstate["display-name"]);
				getFaceit(51,100, channel, userstate["display-name"]);
			  }*/
		}
}





client.on("chat", (channel, userstate, commandMessage, self) => {
	if(userstate["display-name"] != config.username){
		User = userstate["display-name"]

		config.channel.forEach((streamer, index) => {
			if(channel == streamer){
				faceitUsername = config.faceitUsername[index];
			}
		}); 
		
		if(commandMessage.split(" ")[1] != undefined && commandMessage.split(" ")[1].includes("@")) User = commandMessage.split(" ")[1].replace('@','');
		if (talkedRecently.has(commandMessage)) {
				//client.action(channel, `Command in cooldown`); 
		}else {
			talkedRecently.add(commandMessage);
			setTimeout(() => {
			  // Removes the user from the set after a minute
			  talkedRecently.delete(commandMessage);
			}, config.cooldown);

			if (commandMessage.split(" ")[1] == undefined || commandMessage.split(" ")[1].includes("@")){
				Faceitname = faceitUsername;
			} else {
				Faceitname = commandMessage.split(" ")[1];
			}	
			trySwitch(channel, userstate, User, Faceitname, commandMessage.split(" ")[0])
		}
	}  
});


function checkForValue(e, a) {
    for (let t = 0; t < e.roster.length; t++) if (e.roster[t].id === a) return !0;
    return !1;
}

function calculateRatingChange(e, a) {
    var t, r;
    return (r = a - e), (t = 1 / (1 + Math.pow(10, r / 400))), Math.round(50 * (1 - t));
}

async function getEloFromPlayer(e) {
	var isNull = 0;
	  await axios
		  .get("https://open.faceit.com/data/v4/players/" + e, { headers: { Authorization: "Bearer " + config.faceittoken } })
		  .then((e) => {
			  200 !== e.status
				  ? (isNull = !0)
				  : (playerTempElo = e.data.games.csgo.faceit_elo);
		  })
		  .catch(function (e) {}); 
  }


async function getLiveMatch(chanLive, userLive, idLive) {
	await axios
	  .get(
		"https://api.faceit.com/match/v1/matches/groupByState?userId=" + idLive,
	  )
	  .then(async response => {
		if (response.status !== 200) {
		  var isNull = true;
		} else {  
		  var length = 20;
		  var test = response.data;
		  if (Object.keys(test.payload).length == 0) {
			client.action(chanLive, `${Faceitname} is currently not playing a faceitmatch`);
			return;
		  }		  
		let names = Object.getOwnPropertyNames(test.payload)
		var r = test.payload[names[0]][0];
		var ownFactionNumber = checkForValue(r.teams.faction1, idLive) ? 1 : 2;
		console.log(ownFactionNumber);
		var enemyFactionNumber = 1 == ownFactionNumber ? 2 : 1
		  
		var teamname1 = r.teams["faction" + ownFactionNumber].name;
		var teamname2 = r.teams["faction" + enemyFactionNumber].name;

		lastteamID = teamname1 
			
		var playerOwnElo = 0;
		var playerEnemyElo = 0;
		var ownTeamAVGElo = 0;
		var enemyTeamAVGElo = 0;
		var winElo = 0;
		var lossElo = 0;
		  
		  
		  for (let e = 0; e < r.teams["faction" + ownFactionNumber].roster.length; e++){
			await getEloFromPlayer(r.teams["faction" + ownFactionNumber].roster[e].id);
			playerOwnElo += playerTempElo;
		  }
		  
		  for (let e = 0; e < r.teams["faction" + enemyFactionNumber].roster.length; e++) {
			await getEloFromPlayer(r.teams["faction" + enemyFactionNumber].roster[e].id), 
			playerEnemyElo += playerTempElo;
		  }
				  
		  ownTeamAVGElo = Math.floor(playerOwnElo / r.teams["faction" + ownFactionNumber].roster.length);
		  enemyTeamAVGElo = Math.floor(playerEnemyElo / r.teams["faction" + enemyFactionNumber].roster.length);
		  winElo = calculateRatingChange(ownTeamAVGElo, enemyTeamAVGElo);
		  lossElo = 50 - winElo;
		  
		  var link = "https://www.faceit.com/de/csgo/room/" + test.payload[names[0]][0].id;
			
		  if(r.entity.id == config.HubId){
 		    client.action(chanLive, `Inspected user: ${userLive} | FPL-C game ${teamname1} vs ${teamname2} | ROOM: ${link}`);
		  }else{	
		    client.action(chanLive, `Inspected user: ${userLive} | ${teamname1} vs ${teamname2} - AVG. ELO: ${ownTeamAVGElo} Win Elo: ${winElo} - Loss Elo: ${lossElo} AVG. ELO: ${enemyTeamAVGElo} | ROOM: ${link}`);
		  }
		}
	  })
	  .catch(function(error) {console.log(error)});
  }


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




async function getStats20(chan, user, idStats, name20) {
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
          `Here are the stats of the last ${divid} matches [${name20}]: Level: ${faceitlvl} - Elo: ${faceitelo} - Avg. Kills: ${avgKills} - Avg. HS%: ${avgHs}% - Avg. K/D: ${avgKD} - Avg. K/R: ${avgKR}`);
      }
    })
    .catch(function(error) {});
}



async function getFaceitId(userLast) {
    await axios.get('https://open.faceit.com/data/v4/players?nickname=' + userLast, {
        headers: {
            'Authorization': 'Bearer ' + config.faceittoken
		}
	})
	.then(response => {
		if (response.status !== 200) {
			isNull = true;
		} else {
			Identifikation = response.data.player_id;
			faceitlvl = response.data.games.csgo.skill_level;
			faceitelo = response.data.games.csgo.faceit_elo;
		}
	})
	.catch(function (error) {
		client.action(chan, `@` + user + `, I couldn't find a faceitname with ${userLast}`);
	});
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
					if (player.position == 2)
					{
						secondplayer = player.player.nickname;
						secondelo = player.points;
					}
					
					if (player.player.nickname == name)
					{
						played = 1;
						if (player.position <= 2){
							client.action(chan, `${name} current rank is ${player.position} - Streak: ${player.current_streak} - Won: ${player.won} - Lost: ${player.lost} - Points over the 3. place [${response.data.items[2].player.nickname}]: ${player.points - response.data.items[2].points}`);
						} else {
							client.action(chan, `${name} current rank is ${player.position} - Streak: ${player.current_streak} - Won: ${player.won} - Lost: ${player.lost} - Points needed for 2. place [${secondplayer}]: ${secondelo - player.points + 1}`);
						}
					}
				})
			}
		}
	})
	.catch(function (error) {});
}
