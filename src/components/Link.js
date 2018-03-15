import React, { Component } from 'react';
import Modal from 'react-modal';

import FontAwesomeIcon from '@fortawesome/react-fontawesome';
import { faTimes, faEdit } from '@fortawesome/fontawesome-free-solid';

const modalStyles = {
  content: {
    top:         '50%',
    left:        '50%',
    right:       'auto',
    bottom:      'auto',
    marginRight: '-50%',
    transform:   'translate(-50%, -50%)'
  }
};
Modal.setAppElement('#root');

class Link extends Component {
  constructor(props) {
    super(props);

    this.state = { modalIsOpen: false };
  }

  openModal() {
    this.setState({ modalIsOpen: true });
  }

  closeModal() {
    this.setState({ modalIsOpen: false });
  }

  updateLink(event) {
    let updateFields = {};
    const elements = event.currentTarget.elements;
    for (var i = 0; i < elements.length; i++) {
      updateFields[elements[i].name] = elements[i].value;
    }
    this.props.updateLink(this.props.index, updateFields);
  }

  removeLink(link) {
    this.closeModal();
    this.props.removeLink(link.key);
  }

  render() {
    const link = this.props.details;

    return (
      <div className='link'>
        <a href={link.url}>
          <img className='link-image' src={link.image} alt='Link'/>
        </a>
        <div className='link-footer'>
          <div>{link.label}</div>
          <FontAwesomeIcon icon={faEdit} onClick={() => this.openModal()} />
        </div>
        <Modal
          isOpen={this.state.modalIsOpen}
          onRequestClose={() => this.closeModal()}
          style={modalStyles}
          contentLabel='Example Modal'
        >
          <FontAwesomeIcon icon={faTimes} onClick={() => this.closeModal()} />
          <h2>{link.label}</h2>
          <form onChange={event => this.updateLink(event)}>
            <div>
              <label htmlFor='label'>Label</label>
              <input type='text' id='label' name='label' defaultValue={link.label}/>
            </div>
            <div>
              <label htmlFor='url'>Target Url</label>
              <input type='text' id='url' name='url' defaultValue={link.url}/>
            </div>
            <div>
              <label htmlFor='image'>Image Url</label>
              <input type='text' id='image' name='image' defaultValue={link.image}/>
            </div>
          </form>
          <button className='delete' onClick={() => this.removeLink(link)}>delete</button>
        </Modal>
      </div>
    );
  }
}

export default Link;
