//https://stackoverflow.com/a/37217166
const tournamentQueryString =
	"query CurrentRound {\
		tournament(slug: \"${this.slug}\") {\
		id\
		name\
		events {\
			id\
			name\
			phaseGroups {\
				rounds {\
					number\
					bestOf\
				}\
			}\
			videogame {\
				images {\
					url \
				}\
			}\
		}\
		}\
	}";

const pageQueryString =
	"query CurrentRound {\
	  tournament(slug: \"${this.slug}\") {\
		events {\
		  sets (\
			page: ${this.page}\
			perPage: ${this.numPages}\
			sortType: MAGIC\
		  ) {\
			  pageInfo {\
				total\
				page\
			  }\
			  nodes {\
				fullRoundText\
				identifier\
				startedAt\
				completedAt\
				round\
				stream {\
				  enabled\
			    }\
			    slots {\
				  id\
				  standing {\
				    stats {\
				      score {\
				      value\
				      displayValue\
				    }\
			      }\
			    }\
			    entrant {\
			      id\
			      name\
			    }\
			  }\
			}\
		  }\
		}\
	  }\
	}";