var firebaseRef = new Firebase("https://pilt-most-want.firebaseio.com/");

firebaseRef.child("apiControl/apiKey").once("value", function(key) {
	/*firebaseRef.child("bannedChamps/0/champlevels").update({
		44838497: 5
	});*/
	
	function goThroughSummonerList() {
		firebaseRef.child("summonerIds").once("value", function(summonerIds) {
			var summonerList = summonerIds.val();
			
			var addedNewGames = false;
			var counter1 = 0;
			function manualForLoop1(arr) {
				var summoner = summonerList[arr[counter1]];
				counter1++;
				
				if (!summoner["recentGamesLoaded"]) {
					$.ajax({
						type: 'GET',
						url: 'https://na.api.pvp.net/api/lol/na/v2.2/matchlist/by-summoner/' + summoner["summonerId"] + '?beginTime=1461351600000&endTime=1461610800000&api_key=' + key.val(),
						async: true,
						error: function(errorContent) {
							console.log(errorContent);
							// Just skip
							if (counter1 < Object.keys(summonerList).length) {
								manualForLoop1(Object.keys(summonerList));
							} else {
								if (addedNewGames) {
									// Go get the new matches
									goThroughMatchList();
								}
							}
						},
						dataType: 'json',
						success: function(data) {
							if (data["totalGames"] > 0) {
								var matches = data["matches"];
								
								firebaseRef.child("matchIds").once("value", function(snapshot) {
									for (var x = 0; x < matches.length; x++) {
										var matchIdValue = matches[x]["matchId"];
										
										if (!snapshot.child(matchIdValue).exists()) {
											var temp = {};
											temp[matchIdValue] = {summonersLoaded: false, bannedChampionsLoaded: false, matchId: matchIdValue};
											firebaseRef.child("matchIds").update(temp);
											
											addedNewGames = true;
										}
									}
								});
							}
							
							// Marked as recentGamesLoaded
							firebaseRef.child("summonerIds/" + summoner["summonerId"]).update({
								recentGamesLoaded: true
							});
							
							// Step through summoner list
							if (counter1 < Object.keys(summonerList).length) {
								manualForLoop1(Object.keys(summonerList));
							} else {
								if (addedNewGames) {
									// Go get the new matches
									goThroughMatchList();
								}
							}
						},
					});
				} else {
					// Step through summoner list
					if (counter1 < Object.keys(summonerList).length) {
						manualForLoop1(Object.keys(summonerList));
					} else {
						if (addedNewGames) {
							// Go get the new matches
							goThroughMatchList();
						}
					}
				}
			}
			// Run first time
			manualForLoop1(Object.keys(summonerList));
		});
	}
	// Run first time
	goThroughSummonerList();
	
	function goThroughMatchList() {
		firebaseRef.child("matchIds").once("value", function(matchIds) {
			var matchList = matchIds.val();
			
			var addedNewSummoners = false;
			var addedNewBannedChamps = false;
			var counter1 = 0;
			function manualForLoop1(arr) {
				var matchGame = matchList[arr[counter1]];
				counter1++;
				
				if (!matchGame["summonersLoaded"]) {
					$.ajax({
						type: 'GET',
						url: 'https://na.api.pvp.net/api/lol/na/v2.2/match/' + matchGame["matchId"] + '?includeTimeline=false&api_key=' + key.val(),
						async: true,
						error: function(errorContent) {
							// Just skip
							if (counter1 < Object.keys(matchList).length) {
								manualForLoop1(Object.keys(matchList));
							} else {
								if (addedNewSummoners) {
									// Go get the new summoners
									goThroughSummonerList();
								}
							}
						},
						dataType: 'json',
						success: function(data) {
							firebaseRef.child("summonerIds").once("value", function(snapshot) {
								var participantIdentities = data["participantIdentities"];
								
								for (var x = 0; x < participantIdentities.length; x++) {
									var summonerId = participantIdentities[x]["player"]["summonerId"];
									
									if (!snapshot.child(summonerId).exists()) {
										var temp = {};
										temp[summonerId] = {recentGamesLoaded: false, summonerId: summonerId};
										
										firebaseRef.child("summonerIds").update(temp);
										
										addedNewSummoners = true;
									}
								}
							});
							
							// Marked as summonersLoaded
							firebaseRef.child("matchIds/" + matchGame["matchId"]).update({
								summonersLoaded: true
							});
							
							firebaseRef.child("bannedChamps").once("value", function (snapshot) {
								var teams = data["teams"];
								for (var t = 0; t < teams.length; t++) {
									var bans = teams[t]["bans"];
									
									for (var b = 0; b < bans.length; b++) {
										var bannedChampId = bans[b]["championId"];
										
										if (snapshot.child(bannedChampId).exists()) {
											// Increment ban count
											var oldBanCount = snapshot.child(bannedChampId + "/timesBanned").val();
											firebaseRef.child("bannedChamps/" + bannedChampId).update({
												timesBanned: oldBanCount + 1
											});
										} else {
											// New ban champ
											var temp = {};
											temp[bannedChampId] = {champId: bannedChampId, timesBanned: 1};
											
											firebaseRef.child("bannedChamps").update(temp);
											
											addedNewBannedChamps = true;
										}
									}
								}
							});
							
							// Marked as bannedChampionsLoaded
							firebaseRef.child("matchIds/" + matchGame["matchId"]).update({
								bannedChampionsLoaded: true
							});
							
							// Step through summoner list
							if (counter1 < Object.keys(matchList).length) {
								manualForLoop1(Object.keys(matchList));
							} else {
								if (addedNewSummoners) {
									// Go get the new summoners
									goThroughSummonerList();
								}
							}
						},
					});
				} else {
					// Step through match list
					if (counter1 < Object.keys(matchList).length) {
						manualForLoop1(Object.keys(matchList));
					} else {
						if (addedNewSummoners) {
							// Go get the new summoners
							goThroughSummonerList();
						}
					}
				}
			}
			// Run first time
			manualForLoop1(Object.keys(matchList));
		});
	}
	// Run first time
	goThroughMatchList();
});