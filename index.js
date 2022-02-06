const tmi = require("tmi.js");
var axios = require('axios');
const fs = require("fs"); 
const { Console } = require("console");

const config = JSON.parse(fs.readFileSync("cfg.json"));

const talkedRecently = new Set();

var played, inList, secondplayer, secondelo, Identifikation, faceitlvl, faceitelo, month, roomId;
var textArray = ["Blue", "BlueViolet", "CadetBlue", "Chocolate", "Coral", "DodgerBlue", "Firebrick", "GoldenRod", "Green", "HotPink", "OrangeRed", "Red", "SeaGreen", "SpringGreen", "YellowGreen"];

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

const getMonthsPassed = () => {
    const startDate = new Date(2017, 06, 01);
    const currentDate = new Date();
    return (currentDate.getFullYear() - startDate.getFullYear()) * 12 + (currentDate.getMonth() - startDate.getMonth());
};

async function getLeaderboardId(Hub, Season) {
    await axios.get('https://open.faceit.com/data/v4/leaderboards/hubs/' + Hub + '/seasons/' + Season, {
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
    .catch(function (error) { });
}

async function trySwitch(channel, userstate, User, Faceitname, status) {
    try {
        switch (status.toLowerCase()) {
            case '!newmonth':
                if (userstate["user-type"] === 'mod' || userstate["display-name"].toLowerCase() == channel.replace('#', '') || userstate["display-name"] == "Dietze_") {
                    month = getMonthsPassed();
                    client.say(channel, `New FPL-C season: ${month}`);
                    getLeaderboardId(config.HubId, month)
                }
                break;

            case '!feedback':
                client.say(channel, `@` + User + ` If you have any suggestions or bug reports - please send me a Steammessage: http://steamcommunity.com/id/Dietze_`);
                break;

            case '!live':
                await getFaceitId(Faceitname, channel, User);
                await getLiveMatch(channel, Faceitname, Identifikation);
                if (roomId != null) {
                    await getLiveStats(channel, Faceitname, roomId);
                }
                break;

            case '!fpl':
            case '!info':
            case '!fpl-c':
                client.say(channel, `The FPL-Challenger will serve as a way for upcoming talent to compete with like-minded players for their next step in Counter-Strike | Info: http://bit.ly/FPLCircuit`);
                break;

            case '!rank':
            case '!fplc':
            case '!leaderboard':
                played = 0;
                for (i = 0; i <= 150; i += 50) {
                    await getFaceit(i, 50, channel, User, Faceitname);
                }

                sleep(4000).then(() => { if (played == 0) client.say(channel, `${Faceitname} has not yet played a game in the FPL-C.`); });
                break;

            case '!stats':
                await getFaceitId(Faceitname, channel, User);
                await getStats20(channel, User, Identifikation, Faceitname);
                break;

            case '!fplcstats':
                inList = 0;
                for (i = 0; i <= 1000; i += 100) {
                    getStats(i, 100, channel, User, Faceitname);
                }

                sleep(6000).then(() => { if (inList == 0) client.say(channel, `${Faceitname} has not yet played a game in the FPL-C.`); });
                break;

            case '!last':
                await getFaceitId(Faceitname, channel, User);
                await getlast(channel, User, Identifikation, Faceitname);
                break;

            case '!cmd':
            case '!command':
            case '!commands':
                client.say(channel, `@` + User + ` you can use the following Faceit commands: !stats <name> !last <name> !live <name> || FPL-C Commands: !rank <name> !fplcstats <name> !feedback`);
                break;

            default:
        }
    } catch (err) { }
}

client.on("chat", (channel, userstate, commandMessage, self) => {
    if (userstate["display-name"] != config.username) {
        User = userstate["display-name"];

        config.channel.forEach((streamer, index) => {
            if (channel == streamer) {
                faceitUsername = config.faceitUsername[index];
            }
        });

        if (commandMessage.split(" ")[1] != undefined && commandMessage.split(" ")[1].includes("@")) User = commandMessage.split(" ")[1].replace('@', '');
        if (!talkedRecently.has(commandMessage)) {
            talkedRecently.add(commandMessage);
            setTimeout(() => {
                talkedRecently.delete(commandMessage);
            }, config.cooldown);

            if (commandMessage.split(" ")[1] == undefined || commandMessage.split(" ")[1].includes("@")) {
                Faceitname = faceitUsername;
            } else {
                Faceitname = commandMessage.split(" ")[1];
            }

            var randomNumber = Math.floor(Math.random() * textArray.length);
            client.color(textArray[randomNumber]);
            trySwitch(channel, userstate, User, Faceitname, commandMessage.split(" ")[0])
        }
    }
});

function checkForValue(e, a) {
    for (let t = 0; t < e.roster.length; t++) {
        if (e.roster[t].nickname === a) {
            return true;
        }
    }
    return false;
}

function calculateRatingChange(e, a) {
    var gain = Math.round(a - e * a)
    return gain;
}

function calculateRatingChangeOld(e, a) {
    var t, r;
    return (r = a - e), (t = 1 / (1 + Math.pow(10, r / 400))), Math.round(50 * (1 - t));
}

async function getLiveMatch(chanLive, userLive, idLive) {
    await axios.get("https://api.faceit.com/match/v1/matches/groupByState?userId=" + idLive)
    .then(async response => {
        if (response.status == 200) {
            var test = response.data;

            if (Object.keys(test.payload).length == 0) {
                client.say(chanLive, `${Faceitname} is currently not playing a faceitmatch`);
                roomId = null;
                return;
            }

            let names = Object.getOwnPropertyNames(test.payload)
            roomId = response.data.payload[names[0]][0].id;
        }
    })
    .catch(function (error) { console.log(error) });
}

async function getLiveStats(chanLive, userLive, roomLive) {
    await axios.get("https://api.faceit.com/match/v2/match/" + roomLive)
    .then(async response => {
        if (response.status == 200) {
            var test = response.data.payload;
            var ownFactionNumber = checkForValue(test.teams.faction1, userLive) ? 1 : 2;
            var enemyFactionNumber = 1 == ownFactionNumber ? 2 : 1;
            var teamname1 = test.teams["faction" + ownFactionNumber].name;
            var teamname2 = test.teams["faction" + enemyFactionNumber].name;

            if (test.entity.id == config.HubId) {
                client.say(chanLive, `Inspected user: ${userLive} | FPL-C game ${teamname1} vs ${teamname2} | Score: ${test.results[0].factions["faction" + ownFactionNumber].score} - ${test.results[0].factions["faction" + enemyFactionNumber].score}`);
                return;
            }

            var link = "https://www.faceit.com/de/csgo/room/" + roomLive;
            var playerOwnElo = 0;
            var playerEnemyElo = 0

            for (let e = 0; e < test.teams["faction" + ownFactionNumber].roster.length; e++) {
                playerOwnElo += test.teams["faction" + ownFactionNumber].roster[e].elo;
            }

            for (let e = 0; e < test.teams["faction" + enemyFactionNumber].roster.length; e++) {
                playerEnemyElo += test.teams["faction" + enemyFactionNumber].roster[e].elo;
            }

            ownTeamAVGElo = Math.floor(playerOwnElo / test.teams["faction" + ownFactionNumber].roster.length);
            enemyTeamAVGElo = Math.floor(playerEnemyElo / test.teams["faction" + enemyFactionNumber].roster.length);

            winElo = 50;
            winElo = (test.teams["faction" + ownFactionNumber].stats == undefined) ? calculateRatingChangeOld(ownTeamAVGElo, enemyTeamAVGElo) : calculateRatingChange(test.teams["faction" + ownFactionNumber].stats.winProbability, 50);
            lossElo = 50 - winElo;
            
            client.say(chanLive, `Inspected user: ${userLive} | ${teamname1} - AVG. ELO: ${ownTeamAVGElo} vs ${teamname2} - AVG. ELO: ${enemyTeamAVGElo} - WinElo: ${winElo} - LossElo: ${lossElo} | Room: ${link}`);
        }
    })
    .catch(function (error) { console.log(error) });
}

async function getStats(x, y, chan, user, name) {
    await axios.get('https://open.faceit.com/data/v4/hubs/' + config.HubId + '/stats?offset=' + x + '&limit=' + y, {
        headers: {
            'Authorization': 'Bearer ' + config.faceittoken
        }
    })
    .then(response => {
        if (response.status == 200) {
            response.data.players.forEach((player, index) => {
                if (player.nickname == name) {
                    inList = 1;
                    client.say(chan, `Here are the FPLC stats from ${name}: Avg. Kills: ${player.stats["Average Kills"]} - Avg. HS%: ${player.stats["Average Headshots %"]}% - Avg. K/D: ${player.stats["Average K/D Ratio"]} - Win Rate: ${player.stats["Win Rate %"]}`);
                }
            })
        }
    })
    .catch(function (error) { });
}

async function getStats20(chan, user, idStats, name20) {
    await axios.get("https://api.faceit.com/stats/v1/stats/time/users/" + idStats + "/games/csgo")
    .then(response => {
        if (response.status == 200) {
            length = 20;
            var test = response.data;
            if (test.length == 0)
                return;

            if (test.length <= 20) {
                length = test.length;
            }

            var kills = 0, avgKills = 0, HS = 0, avgHs = 0, divid = 0, KD = 0, avgKD = 0, KR = 0, avgKR = 0;

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
            client.say(chan, `Here are the stats of the last ${divid} matches [${name20}]: Level: ${faceitlvl} - Elo: ${faceitelo} - Avg. Kills: ${avgKills} - Avg. HS%: ${avgHs}% - Avg. K/D: ${avgKD} - Avg. K/R: ${avgKR}`);
        }
    })
    .catch(function (error) { });
}

async function getFaceitId(userLast, chan, user) {
    await axios.get('https://open.faceit.com/data/v4/players?nickname=' + userLast, {
        headers: {
            'Authorization': 'Bearer ' + config.faceittoken
        }
    })
    .then(response => {
        if (response.status == 200) {
            Identifikation = response.data.player_id;
            faceitlvl = response.data.games.csgo.skill_level;
            faceitelo = response.data.games.csgo.faceit_elo;
        }
    })
    .catch(function (error) {
        client.say(chan, `@` + user + `, I couldn't find a faceitname with ${userLast}`);
    });
}

async function getlast(chan, user, idLast, userLast) {
    await axios.get('https://api.faceit.com/stats/v1/stats/time/users/' + idLast + '/games/csgo?size=1')
    .then(response => {
        if (response.status == 200) {
            last = response.data[0];
            lastmatchid = last.matchId
            var won = (last.teamId == last.i2) ? "won" : "lost";
            client.say(chan, `${userLast} ${won} last map on ${last.i1} with a score of ${last.i18}. Stats: Kills: ${last.i6} - Assists: ${last.i7} - Deaths: ${last.i8} - HS%: ${last.c4}%`);
        }
    })
    .catch(function (error) { });
}

async function getFaceit(x, y, chan, user, name) {
    await axios.get('https://open.faceit.com/data/v4/leaderboards/' + leaderboardId + '?offset=' + x + '&limit=' + y, {
        headers: {
            'Authorization': 'Bearer ' + config.faceittoken
        }
    })
    .then(response => {
        if (response.status == 200) {
            if (response.data.leaderboard.status == 'UPCOMING' && played == 0) {
                played = 2;
                client.say(chan, `There is no leaderboard at the moment. The FPL-Challenger EU Qualifiers December Edition 2021 starts, Sat. 15 Jan 2022, 12:00 CET`);
            } else {
                response.data.items.forEach((player) => {
                    if (player.position == 2) {
                        secondplayer = player.player.nickname;
                        secondelo = player.points;
                    }

                    if (player.player.nickname == name) {
                        played = 1;
                        if (player.position <= 2) {
                            client.say(chan, `${name} current rank is ${player.position} - Streak: ${player.current_streak} - Won: ${player.won} - Lost: ${player.lost} - Points over the 3. place [${response.data.items[5].player.nickname}]: ${player.points - response.data.items[5].points}`);
                        } else {
                            client.say(chan, `${name} current rank is ${player.position} - Streak: ${player.current_streak} - Won: ${player.won} - Lost: ${player.lost} - Points needed for 2. place [${secondplayer}]: ${secondelo - player.points + 1}`);
                        }
                    }
                })
            }
        }
    })
    .catch(function (error) { });
}
