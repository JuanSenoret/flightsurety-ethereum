import ConfigWeb3 from './ConfigWeb3';

class Initialization {
    constructor () {
        this.web3Object = null;
    }

    async start () {
        try {
            console.log('Start initialization');
            const configWeb3Object = new ConfigWeb3();
            this.web3Object = await configWeb3Object.getWeb3();
            // Authorize App contract address to call data contract
            await this._authorizeAppContractCaller();
            // Register airline2 and submit fund
            await this._registerAirlines(this.web3Object.airline2, this.web3Object.airline2Name, this.web3Object.airline1);
            await this._submitFundAirline(this.web3Object.airline2, this.web3Object.airline2Name, this.web3Object.submitionFundAirline);
            // Register airline3 and submit fund
            await this._registerAirlines(this.web3Object.airline3, this.web3Object.airline3Name, this.web3Object.airline1);
            await this._submitFundAirline(this.web3Object.airline3, this.web3Object.airline3Name, this.web3Object.submitionFundAirline);

        } catch (error) {
            console.log('Ganache network of smart contracts address missmatch. Error: ' + error);
        }
    }

    async _authorizeAppContractCaller () {
        await this.web3Object.flightSuretyDataContract.methods
        .authorizeContractCaller(this.web3Object.flightSuretyAppContractAddress)
        .send({
            from: this.web3Object.owner,
            gas: this.web3Object.gas
        })
        .then((result) =>{
            console.log(`Data contract function ${result.events.AuthorizeContractCaller.event} authorize the app contract address ${result.events.AuthorizeContractCaller.returnValues.authorizedCaller}`);
        })
        .catch((error) =>{
            console.log(`Error by _authorizeAppContractCaller ${error}`);
        });
    }

    async _registerAirlines (airlineAddress, airlineName, airlineOriginAddress) {
        console.log(`Registering airline ${airlineName}`);
        await this.web3Object.flightSuretyAppContract.methods
        .registerAirline(
            airlineAddress,
            airlineName
        )
        .send({
            from: airlineOriginAddress,
            gas: this.web3Object.gas
        })
        .then(result =>{
            //console.log(result);
            console.log(`App contract function ${result.events.AirlineRegistration.event} successfully register new airline ${airlineName}`);
        })
        .catch((error) =>{
            // Uncomment for debugging
            //console.log(`Error by _registerAirlines ${error}`);
            console.log(`Airline ${airlineName} already registered`);
        });
    }

    async _submitFundAirline (airlineAddress, airlineName, fundAmount) {
        console.log(`Submitting fund for airline ${airlineName}`);
        await this.web3Object.flightSuretyAppContract.methods
        .submitFundAirline()
        .send({
            from: airlineAddress,
            value: fundAmount,
            gas: this.web3Object.gas
        })
        .then((result) =>{
            //console.log(result);
            console.log(`App contract function ${result.events.AirlineSubmittedFund.event} successfully submit fund for airline ${airlineName}`);
        })
        .catch((error) =>{
            // Uncomment for debugging
            //console.log(`Error by _registerAirlines ${error}`);
            console.log(`Airline ${airlineName} already registered`);
        });

    }

    async _registerFlight () {
        let timestamp = Math.floor(Date.now() / 1000);
    }
}

export default Initialization;
