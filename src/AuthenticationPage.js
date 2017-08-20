import React, { Component } from 'react';
import { ScrollView, View, StyleSheet, Button, Alert, Text, Share, AsyncStorage } from 'react-native';
import { Constants, Facebook, Google } from 'expo';

import { graphql, compose, gql } from 'react-apollo'

class AuthenticationPage extends Component {
  state = {
    graphcoolId: null,
    firstName: null,
    lastName: null,
    email: null,
    profilePicture: null,
  };

  _handleFacebookLogin = async () => {
    const { type, token, expires } = await Facebook.logInWithReadPermissionsAsync(
      '1201211719949057', // Replace with your own app id in standalone app
      { permissions: ['public_profile', 'email', 'user_friends'] }
    );
    switch (type) {
      case 'success': {
        const response = await fetch(`https://graph.facebook.com/me?fields=id,first_name,last_name,picture,gender,email&access_token=${token}`);
        const profile = await response.json();

        this.setState({
          firstName: profile.first_name,
          lastName: profile.last_name,
          email: profile.email,
          profilePicture: profile.picture.data.url });

        await this.props.facebookLogin({
          variables: {
            facebookToken: token,
          },
        }).then(( { data } ) => {
          this._storeAuthTokensLocally( data.authenticateFacebookUser.token, token, expires );
        });

        this._updateUserProfile();
        break;
      }
      case 'cancel': {
        Alert.alert( 'Cancelled!', 'Login was cancelled!' );
        break;
      }
      default: {
        Alert.alert( 'Error', 'Facebook login returned error.' );
      }
    }
  }

  _handleGoogleLogin = async () => {
    const { type, user, idToken, refreshToken } = await Google.logInAsync({
      androidStandaloneAppClientId: '<ANDROID_CLIENT_ID>',
      iosStandaloneAppClientId: '<IOS_CLIENT_ID>',
      androidClientId: '603386649315-9rbv8vmv2vvftetfbvlrbufcps1fajqf.apps.googleusercontent.com',
      iosClientId: '603386649315-vp4revvrcgrcjme51ebuhbkbspl048l9.apps.googleusercontent.com',
      scopes: ['profile', 'email']
    });

    switch (type) {
      case 'success': {
        this.setState({
          firstName: user.givenName,
          lastName: user.familyName,
          email: user.email,
          profilePicture: user.photoUrl });

        await this.props.googleLogin({
          variables: {
            googleToken: idToken,
          },
        }).then(( { data } ) => {
          this._storeAuthTokensLocally( data.authenticateGoogleUser.token, idToken, refreshToken );
        });

        this._updateUserProfile();
        break;
      }
      case 'cancel': {
        Alert.alert( 'Cancelled!', 'Login was cancelled!' );
        break;
      }
      default: {
        Alert.alert( 'Error', 'Google login returned error.' );
      }
    }
  }

  _storeAuthTokensLocally = async ( graphcoolToken, socialLoginToken, socialLoginValidity ) => {
    await AsyncStorage.setItem('graphcoolToken', graphcoolToken );
    await AsyncStorage.setItem('socialLoginToken', socialLoginToken );
    await AsyncStorage.setItem('socialLoginValidity', socialLoginValidity );
  }

  _updateUserProfile = async () => {
    let userResult = await this.props.fetchCurrentUser.refetch();

    this.setState({ graphcoolId: userResult.data.user.id });
    await AsyncStorage.setItem('graphcoolUserId', userResult.data.user.id);

    await this.props.updateUser({
      variables: {
        id: userResult.data.user.id,
        firstName: this.state.firstName,
        lastName: this.state.lastName,
        email: this.state.email,
        profilePicture: this.state.profilePicture,
      }
    });
    await this.props.fetchCurrentUser.refetch();
  }

  render() {
    return (
      <ScrollView style={styles.container}>
        <Button
          title="Login with Facebook"
          onPress={() => this._handleFacebookLogin()}
        />
        <Button
          title="Login with Google"
          onPress={() => this._handleGoogleLogin()}
        />
        <Text>Name: {this.state.firstName} {this.state.lastName}</Text>
        <Text>Email: {this.state.email}</Text>
        <Text>Graphcool Id: {this.state.graphcoolId}</Text>
      </ScrollView>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: Constants.statusBarHeight,
    backgroundColor: '#ecf0f1',
  },
});

const facebookLoginMutation = gql`
  mutation facebookLogin ( $facebookToken: String! )
  { authenticateFacebookUser ( facebookToken: $facebookToken )
    { token } }`;

const googleLoginMutation = gql`
  mutation googleLogin ( $googleToken: String! )
  { authenticateGoogleUser ( googleToken: $googleToken )
    { token } }`;

const currentUserQuery = gql`
  {
    user
    {
      id
      firstName
      lastName
      email
    }
  }`

const updateUserMutation = gql`
  mutation updateUser(
    $id: ID!,
    $firstName: String!,
    $lastName: String!,
    $email: String!,
    $profilePicture: String!)
  {
    updateUser (
      id: $id
      firstName: $firstName
      lastName: $lastName
      email: $email
      profilePicture: $profilePicture
    )
    {
      id
      firstName
      lastName
      email
      profilePicture
    }
  }
`;

export default compose (
  graphql(facebookLoginMutation, { name: 'facebookLogin' } ),
  graphql(googleLoginMutation, { name: 'googleLogin' } ),
  graphql(currentUserQuery, { name: 'fetchCurrentUser' }),
  graphql(updateUserMutation, { name: 'updateUser' } ),
)(AuthenticationPage);
