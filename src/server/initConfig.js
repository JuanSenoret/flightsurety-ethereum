const Config = function(accounts) {

    return {
        owner: accounts[0],
        airline1: accounts[0],
        airline1Name: 'AdminAirline',
        airline2: accounts[4],
        airline2Name: 'Lufthansa',
        airline3: accounts[5],
        airline3Name: 'KLM',
        airline4: accounts[6],
        airline4Name: 'Iberia',
        flight1Airline2Code: 'LH027',
        flight1Airline2CodeDeparture: 'Hamburg',
        flight1Airline2CodeArrival: 'Frankfurt',
        flight2Airline2Code: 'LH2075',
        flight2Airline2CodeDeparture: 'Hamburg',
        flight2Airline2CodeArrival: 'Munich',
        flight1Airline3Code: 'KL0751',
        flight1Airline3CodeDeparture: 'Amsterdam',
        flight1Airline3CodeArrival: 'Guayaquil',
        flight2Airline3Code: 'KL1223',
        flight2Airline3CodeDeparture: 'Amsterdam',
        flight2Airline3CodeArrival: 'Atlanta'
    }
}

export default Config;
