import Hapi from 'hapi';
import Initialization from './modules/Initialization';

const server = new Hapi.Server({
    host:'localhost',
    port:5000
});

const init = new Initialization();
init.start();

// Endpoint
server.route( {
    method: 'GET',
    path: '/api',
    handler: ( request, h ) => {
        let response;
        response = h.response(['Test response']);
        response.code(200);
        response.header('Content-Type', 'application/json; charset=utf-8');
        return response;
    }
} );

server.start( err => {
    if( err ) {
        // Fancy error handling here
        console.error( 'Error was handled!' );
        console.error( err );
    }
    console.log( `Server started at ${ server.info.uri }`);
} );
