
import http from 'http'
import app from './server'
//import InitSmartContract from './modules/initializationSmartContract';

const server = http.createServer(app)
let currentApp = app
server.listen(3000)
//const initSmartContract = new InitSmartContract();

if (module.hot) {
    //initSmartContract.startInit();
    module.hot.accept('./server', () => {
        server.removeListener('request', currentApp);
        server.on('request', app);
        currentApp = app;
    });
}
