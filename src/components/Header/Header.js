import React, { Component } from 'react';

import './Header.css';

import CloseIcon from '../../assets/icons/baseline-close-24px.js';
import MoreVertIcon from '../../assets/icons/baseline-more_vert-24px.js';

class Header extends Component {
  constructor(props) {
    super(props);

    this.state = { settingsOpen: false };
  }

  toggleSettings() {
    this.setState({ settingsOpen: !this.state.settingsOpen });
  }

  renderIcon() {
    const icon = this.state.settingsOpen ? CloseIcon : MoreVertIcon;
    return <div onClick={() => this.toggleSettings()}>{icon}</div>;
  }

  render () {
    const settingsOpen = this.state.settingsOpen;
    const { updateBackground, backgroundUrl } = this.props;
    return (
      <header className='header'>
        <div className='brand'>Launch Tabs</div>
        <div className='settings'>
          <div className='controls' style={{ display: settingsOpen ? 'inline-block' : 'none' }}>
            <input placeholder='Set Background Image' type='text' defaultValue={backgroundUrl} ref={(input) => { this.backgroundInput = input; }} />
            <button onClick={() => updateBackground(this.backgroundInput.value)}>Update</button>
          </div>
          {this.renderIcon()}
        </div>
      </header>
    );
  }
}

export default Header;
