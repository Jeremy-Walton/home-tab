import React, { Component } from 'react';
import { version } from '../package.json';

import './App.css';

import Link from './components/Link.js';
import Header from './components/Header/Header.js';

import AddIcon from './assets/icons/baseline-add-24px.js';

import { DragDropContext } from 'react-dnd';
import HTML5Backend from 'react-dnd-html5-backend';

class App extends Component {
  constructor() {
    super();

    const data = localStorage.state ? JSON.parse(localStorage.state) : {};
    let links = data.links || [];

    if (!Array.isArray(data.links)) {
      links = Object.keys(links).map((link) => links[link]);
    }

    links.forEach((link, i) => { link.id = i });

    this.state = { links, backgroundUrl: data.backgroundUrl ? data.backgroundUrl : '' };
  }

  componentDidUpdate(_, __) {
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
    links.push({
      key: timestamp,
      id: this.nextID(),
      label: 'New Tab Page',
      url: 'https://www.launchtabs.com/home-tab',
      image: 'https://i.imgur.com/W0t0xs8.jpg',
      isDisabled: false,
      color: '#d5dce2'
    });
    this.setState({ links });
  }

  nextID() {
    return Math.max.apply(null, this.state.links.map(link => link.id)) + 1;
  }

  removeLink(link) {
    const links = this.state.links;
    links.splice(link.id, 1);
    this.setState({ links });
  }

  updateBackground(value) {
    this.setState({ backgroundUrl: value });
  }

  renderLink(link, i) {
    return (
      <Link
        key={link.key}
        index={i}
        details={link}
        moveLink={(dragIndex, hoverIndex) => this.moveLink(dragIndex, hoverIndex)}
        updateLink={(key, updateFields) => this.updateLink(key, updateFields)}
        removeLink={() => this.removeLink(link)}
      />
    );
  }

  moveLink(dragIndex: number, hoverIndex: number) {
    let { links } = this.state;
    links.splice(hoverIndex, 0, links.splice(dragIndex, 1)[0]);
    this.setState({ links });
  }

  renderWelcomeMessage() {
    let message;

    if (this.state.links.length === 0) {
      message = (
        <div className='welcome-message'>
          <h1>Welcome to Launch Tabs!</h1>
          <p>Press to add the first link to your dashboard.</p>
          <div className='new-link welcome' onClick={() => this.addLink()}>
            {AddIcon}
          </div>
        </div>
      );
    }
    return message;
  }

  render() {
    const { links, backgroundUrl } = this.state;

    return (
      <div>
        <Header
          backgroundUrl={backgroundUrl}
          updateBackground={value => this.updateBackground(value)}
        />
        <div className='header-fix'></div>
        <div className='background-image' style={{ backgroundImage: `url('${backgroundUrl}')` }}>
          <div className='new-link' onClick={() => this.addLink()}>
            {AddIcon}
          </div>
          <div className='link-container'>
            {this.renderWelcomeMessage()}
            {links.map((link, i) => this.renderLink(link, i))}
          </div>
          <div className='closing-text'>© 2020 Jeremy Walton. All Rights Reserved. <a href="https://www.google.com/url?sa=t&rct=j&q=&esrc=s&source=web&cd=1&cad=rja&uact=8&ved=0CB4QFjAAahUKEwja-J-1uvXHAhVKjA0KHWocD4E&url=https%3A%2F%2Fchrome.google.com%2Fwebstore%2Fdetail%2Fnew-tab-redirect%2Ficpgjfneehieebagbmdbhnlpiopdcmna%3Fhl%3Den&usg=AFQjCNGD4wPwU__qhusrsJYNjSgIL6dp0g&sig2=0C5gcrLHvFXMtUcngGLM2g">Use this extention to redirect to this page when opening a new tab.</a> v{version}</div>
        </div>
      </div>
    );
  }
}

export default DragDropContext(HTML5Backend)(App);
