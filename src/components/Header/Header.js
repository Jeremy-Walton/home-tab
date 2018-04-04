import React, { Component } from 'react';

import './Header.css';

import FontAwesomeIcon from '@fortawesome/react-fontawesome'
import { faBars, faTimes } from '@fortawesome/fontawesome-free-solid'

class Header extends Component {
  constructor(props) {
    super(props);

    this.state = { settingsOpen: false };
  }

  toggleSettings() {
    this.setState({ settingsOpen: !this.state.settingsOpen });
  }

  renderIcon() {
    const icon = this.state.settingsOpen ? faTimes : faBars;
    return <FontAwesomeIcon icon={icon} size='2x' onClick={() => this.toggleSettings()} />;
  }

  render () {
    const settingsOpen = this.state.settingsOpen;
    const { updateBackground, backgroundUrl } = this.props;
    return (
      <header className='header'>
        <div className='settings'>
          {this.renderIcon()}
          <div className='controls' style={{ display: settingsOpen ? 'inline-block' : 'none' }}>
            <input placeholder='Set Background Image' type='text' defaultValue={backgroundUrl} ref={(input) => { this.backgroundInput = input; }} />
            <button onClick={() => updateBackground(this.backgroundInput.value)}>Update</button>
          </div>
        </div>
        <h1>Home Tab</h1>
      </header>
    );
  }
}

export default Header;
