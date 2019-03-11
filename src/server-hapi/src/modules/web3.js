import Config from '../config/config.json';
import Web3 from 'web3';

const config = Config['localhost'];
const web3 = new Web3(new Web3.providers.WebsocketProvider(config.url.replace('http', 'ws')));

const ConfigWeb3 = async () => {
    const accounts = await web3.eth.getAccounts();
    web3.eth.defaultAccount = accounts[0];
    console.log('Account[0]: ' + web3.eth.defaultAccount);
    return{
        web3: web3
    };
}

export default ConfigWeb3;