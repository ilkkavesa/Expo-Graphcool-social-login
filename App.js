import React, { Component } from 'react';
import { ScrollView, View, StyleSheet, Button, Alert, Text, Share, AsyncStorage } from 'react-native';

import AuthenticationPage from './src/AuthenticationPage'

import { ApolloProvider, ApolloClient, createNetworkInterface } from 'react-apollo'

const networkInterface = createNetworkInterface({ uri: '__GRAPHCOOL_ENDPOINT_HERE__' });

networkInterface.use([{
  async applyMiddleware(req, next) {
    if (!req.options.headers) {
      req.options.headers = {}  // Create the header object if needed.
    }

    await AsyncStorage.getItem('graphcoolToken').then(
      encodedToken => {
        req.options.headers['authorization'] = `Bearer ${encodedToken}`
       //  next()
     })
     .then(next)  // call next() after authorization header is set.
     .catch(err => console.log(err));
  }
}]);

const client = new ApolloClient({ networkInterface })

export default class App extends Component {
  render() {
    return (
      <ApolloProvider client={client}>
         <AuthenticationPage />
      </ApolloProvider>
    );
  }
}
