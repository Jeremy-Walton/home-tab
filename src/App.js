import React, { Component } from 'react';
import { version } from '../package.json';

import './App.css';

import Link from './components/Link.js';
import Header from './components/Header/Header.js';

import FontAwesomeIcon from '@fortawesome/react-fontawesome'
import faPlus from '@fortawesome/fontawesome-free-solid/faPlus'

class App extends Component {
  constructor() {
    super();

    const data = localStorage.state ? JSON.parse(localStorage.state) : {};
    const links = data.links || {};

    Object.keys(links).forEach((key, index) => {
      links[key]['key'] = index;
    });

    this.state = { links, backgroundUrl: data.backgroundUrl ? data.backgroundUrl : '' };
  }

  componentDidUpdate(prevProps, prevState) {
    localStorage.state = JSON.stringify(this.state);
  }

  updateLink(key, updateFields) {
    const links = this.state.links;

    for (var i = 0; i < Object.keys(updateFields).length; i++) {
      links[key][Object.keys(updateFields)[i]] = updateFields[Object.keys(updateFields)[i]];
    }
    this.setState({ links });
  }

  addLink() {
    var timestamp = (new Date()).getTime();
    const links = this.state.links;
    links[timestamp] = { key: timestamp, label: 'New Tab page', url: 'https://www.launchtabs.com/home-tab', image: 'https://i.imgur.com/iUI8B7S.jpg'};
    this.setState({ links });
  }

  removeLink(key) {
    const links = this.state.links;
    delete links[key];
    this.setState({ links });
  }

  updateBackground(value) {
    this.setState({ backgroundUrl: value });
  }

  renderLink(key) {
    return (
      <Link
        key={key}
        index={key}
        details={this.state.links[key]}
        updateLink={(key, updateFields) => this.updateLink(key, updateFields)}
        removeLink={() => this.removeLink(key)}
      />
    );
  }

  render() {
    const { links, backgroundUrl } = this.state;

    return (
      <div>
        <Header
          backgroundUrl={backgroundUrl}
          updateBackground={value => this.updateBackground(value)}
        />
        <div class='background-image' style={{ 'background-image': `url('${backgroundUrl}')` }}>
          <div className='link-container'>
            {Object.keys(links).map(key => this.renderLink(key))}
            <div className='link new-link' onClick={() => this.addLink()}>
              <FontAwesomeIcon icon={faPlus} size='4x' />
            </div>
          </div>
          <div className='closing-text'>© 2018 Jeremy Walton. All Rights Reserved. <a href="https://www.google.com/url?sa=t&rct=j&q=&esrc=s&source=web&cd=1&cad=rja&uact=8&ved=0CB4QFjAAahUKEwja-J-1uvXHAhVKjA0KHWocD4E&url=https%3A%2F%2Fchrome.google.com%2Fwebstore%2Fdetail%2Fnew-tab-redirect%2Ficpgjfneehieebagbmdbhnlpiopdcmna%3Fhl%3Den&usg=AFQjCNGD4wPwU__qhusrsJYNjSgIL6dp0g&sig2=0C5gcrLHvFXMtUcngGLM2g">Use this extention to redirect to this page when opening a new tab.</a> v{version}</div>
        </div>
      </div>
    );
  }
}

export default App;
