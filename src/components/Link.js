import React, { Component } from 'react';
import Modal from 'react-modal';

import CloseIcon from '../assets/icons/baseline-close-24px.js';
import EditIcon from '../assets/icons/baseline-edit-24px.js';

import { DragSource, DropTarget, DropTargetMonitor } from 'react-dnd';

const modalStyles = {
  content: {
    top: 'initial',
    left: 'initial',
    right: 'initial',
    bottom: 'auto',
    borderRadius: '8px',
    border: '1px solid #dadce0',
  }
};
Modal.setAppElement('#root');

class Link extends Component {
  constructor(props) {
    super(props);

    this.state = { modalIsOpen: false };
  }

  setModal(value) {
    this.setState({ modalIsOpen: value });
  }

  updateLink(event) {
    let updateFields = {};
    const elements = event.currentTarget.elements;
    for (var i = 0; i < elements.length; i++) {
      const element = elements[i]
      const newValue = element.name === 'isDisabled' ? element.checked : element.value

      updateFields[element.name] = newValue;
    }
    this.props.updateLink(this.props.index, updateFields);
  }

  removeLink(link) {
    if (window.confirm('Are you sure you want to delete this Link?')) {
      this.setModal(false);
      this.props.removeLink(link.key);
    }
  }

  renderImage() {
    const { details: link } = this.props;

    const image = <img className='link-image' src={link.image} alt='Unavailable' />;
    if (link.isDisabled) {
      return <div className='image-wrapper disabled-link'>{image}</div>;
    } else {
      return <a className='image-wrapper' href={link.url}>{image}</a>;
    }
  }

  render() {
    const { connectDropTarget, connectDragSource, isDragging, details: link } = this.props;

    return connectDropTarget(connectDragSource(
      <div style={{ opacity: isDragging ? 0 : 1 }} className='link'>
        {this.renderImage()}
        <div className='link-footer'>
          <div>{link.label}</div>
          <div onClick={() => this.setModal(true)}>{EditIcon}</div>
        </div>
        <Modal
          isOpen={this.state.modalIsOpen}
          onRequestClose={() => this.setModal(false)}
          style={modalStyles}
          contentLabel='Example Modal'
        >
          <div className='modal-title'>
            <div>
              <h2>{link.label || 'Enter Title'}</h2>
            </div>
            <div>
              <div onClick={() => this.setModal(false)}>{CloseIcon}</div>
            </div>
          </div>
          <form onChange={event => this.updateLink(event)}>
            <div className='form-control'>
              <label htmlFor='title'>Title</label>
              <input type='text' id='title' name='label' placeholder='Enter Title' defaultValue={link.label}/>
            </div>
            <div className='form-control'>
              <label htmlFor='url'>Target Url</label>
              <input type='text' id='url' name='url' placeholder='Enter Url' defaultValue={link.url}/>
            </div>
            <div className='form-control'>
              <label htmlFor='image'>Image Url</label>
              <input type='text' id='image' name='image' placeholder='Enter Image URL' defaultValue={link.image}/>
            </div>
            <div className='form-control'>
              <label htmlFor='isDisabled'>Disabled</label>
              <input type='checkbox' id='isDisabled' name='isDisabled' defaultChecked={link.isDisabled}/>
            </div>
          </form>
          <button className='delete' onClick={() => this.removeLink(link)}>delete</button>
        </Modal>
      </div>
    ));
  }
};

const collect = (connect, monitor) => ({ connectDragSource: connect.dragSource(), isDragging: monitor.isDragging() });
const collectDrop = (connect, monitor) => ({ connectDropTarget: connect.dropTarget() });

const linkTarget = {
  hover(props: LinkProps, monitor: DropTargetMonitor, component) {
    if (!component) { return null }
    const dragIndex = monitor.getItem().index;
    const hoverIndex = props.index;

    if (dragIndex === hoverIndex) { return }

    props.moveLink(dragIndex, hoverIndex);
    monitor.getItem().index = hoverIndex;
  },
};

const linkSource = {
  beginDrag(props: LinkProps) {
    return { key: props.key, index: props.index };
  }
};

const dropTargetHOC = DropTarget('link', linkTarget, collectDrop);
const dragSourceHOC = DragSource('link', linkSource, collect);

export default dropTargetHOC(dragSourceHOC(Link));
