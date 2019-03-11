import Config from '../config/config.json';
import FlightSuretyApp from '../../../../build/contracts/FlightSuretyApp.json';
import FlightSuretyData from '../../../../build/contracts/FlightSuretyData.json';
import Web3 from 'web3';

class ConfigWeb3 {
    constructor () {
        this.web3 = null;
        this.accounts = null;
        this.flightSuretyAppContract = null;
        this.flightSuretyDataContract = null;
        this.config = null;
    }

    async getWeb3 () {
        try {
            this.config = Config['localhost'];
            // Get web3 instance
            this.web3 = new Web3(new Web3.providers.WebsocketProvider(this.config.url.replace('http', 'ws')));
            this.accounts = await this.web3.eth.getAccounts();
            this.web3.eth.defaultAccount = this.accounts[0];
            //console.log('Account[0]: ' + this.web3.eth.defaultAccount);
            // Get flightSuretyApp contract instance
            this.flightSuretyAppContract = new this.web3.eth.Contract(FlightSuretyApp.abi, this.config.appAddress);
            // Get flightSuretyData contract instance
            this.flightSuretyDataContract = new this.web3.eth.Contract(FlightSuretyData.abi, this.config.dataAddress);
        } catch (error) {
            console.log(error);
            return null;
        }
        return{
            web3: this.web3,
            accounts: this.accounts,
            flightSuretyAppContract: this.flightSuretyAppContract,
            flightSuretyDataContract: this.flightSuretyDataContract,
            flightSuretyAppContractAddress: this.config.appAddress,
            flightSuretyDataContractAddress: this.config.dataAddress,
            owner: this.accounts[0],
            airline1: this.accounts[0],
            airline1Name: 'AdminAirline',
            airline2: this.accounts[4],
            airline2Name: 'Lufthansa',
            airline3: this.accounts[5],
            airline3Name: 'KLM',
            airline4: this.accounts[6],
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
            flight2Airline3CodeArrival: 'Atlanta',
            gas: "6721975",
            submitionFundAirline: this.web3.utils.toWei('1', "ether")
        };
    }
}

export default ConfigWeb3;