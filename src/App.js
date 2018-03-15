import React, { Component } from 'react';

import Link from './components/Link.js';
import './App.css';

class App extends Component {
  constructor() {
    super();

    const data = localStorage.state ? JSON.parse(localStorage.state) : {};
    const links = data.links || {};

    Object.keys(links).forEach((key, index) => {
      links[key]['key'] = index;
    });

    this.state = { links, backgroundUrl: data.backgroundUrl, backgroundEditorOpen: false };
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
    links[timestamp] = { key: timestamp, label: 'New Tab page', url: 'http://jeremy-walton.bitbucket.org/', image: 'http://i.imgur.com/iUI8B7S.jpg'};
    this.setState({ links });
  }

  removeLink(key) {
    const links = this.state.links;
    delete links[key];
    this.setState({ links });
  }

  toggleBackgroundEditor() {
    const backgroundEditorOpen = !this.state.backgroundEditorOpen;
    this.setState({ backgroundEditorOpen });
  }

  updatebackground() {
    this.setState({ backgroundUrl: this.backgroundInput.value });
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
    const { links, backgroundUrl, backgroundEditorOpen } = this.state;

    return (
      <div style={{ background: `url('${backgroundUrl}')` }}>
        <div className='theme-selector'>
          <button className='theme-toggle' onClick={() => this.toggleBackgroundEditor()}>Edit Background</button>
          <div className='themes' style={{ display: backgroundEditorOpen ? 'inline-block' : 'none' }}>
            <input className='image-selection' placeholder='Set Background Image' type='text' defaultValue={backgroundUrl} ref={(input) => { this.backgroundInput = input; }} />
            <button className='image-selection-button' onClick={() => this.updatebackground()}>Enter URL</button>
          </div>
        </div>
        <div className='link-container'>
          {Object.keys(links).map(key => this.renderLink(key))}
          <div className='link new-link'>
            <i className='fa fa-plus fa-4x' onClick={() => this.addLink()}></i>
          </div>
        </div>
        <div className='closing-text'>© 2018 Jeremy Walton. All Rights Reserved. <a href="https://www.google.com/url?sa=t&rct=j&q=&esrc=s&source=web&cd=1&cad=rja&uact=8&ved=0CB4QFjAAahUKEwja-J-1uvXHAhVKjA0KHWocD4E&url=https%3A%2F%2Fchrome.google.com%2Fwebstore%2Fdetail%2Fnew-tab-redirect%2Ficpgjfneehieebagbmdbhnlpiopdcmna%3Fhl%3Den&usg=AFQjCNGD4wPwU__qhusrsJYNjSgIL6dp0g&sig2=0C5gcrLHvFXMtUcngGLM2g">Use this extention to redirect to this page when opening a new tab.</a> v1.5</div>
      </div>
    );
  }
}

export default App;
