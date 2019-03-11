import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import Config from './config.json';
import web3 from './web3';

const config = Config['localhost'];

const flightSuretyAppContract = new web3.eth.Contract(
    FlightSuretyApp.abi,
    config.appAddress
);

export default flightSuretyAppContract;