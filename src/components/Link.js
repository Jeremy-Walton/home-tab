// region Imports
import PropTypes from 'prop-types'
import React, { useState } from 'react'

import Modal from 'react-modal'

import CloseIcon from '../assets/icons/baseline-close-24px.js'
import EditIcon from '../assets/icons/baseline-edit-24px.js'

import { DragSource, DropTarget } from 'react-dnd'

import Color from '../models/Color.js'
// endregion

const modalStyles = {
  content: {
    top: 'initial',
    left: 'initial',
    right: 'initial',
    bottom: 'auto',
    borderRadius: '8px',
    border: '1px solid #dadce0',
  }
}
Modal.setAppElement('#root')

function Link({ index, updateLink, removeLink, linkDetails, connectDropTarget, connectDragSource, isDragging }) {
  // region Initialization
  const [modalIsOpen, setModalIsOpen] = useState(false)
  const [editActive, setEditActive] = useState(false)

  const color = new Color(linkDetails.color)
  // endregion

  // region Helper function
  function handleFormChanges(event) {
    let updateFields = {}
    const elements = event.currentTarget.elements

    for (var i = 0; i < elements.length; i++) {
      const element = elements[i]
      const newValue = element.name === 'isDisabled' ? element.checked : element.value

      updateFields[element.name] = newValue
    }
    updateLink(index, updateFields)
  }

  function handleDelete() {
    if (window.confirm('Are you sure you want to delete this Link?')) {
      setModalIsOpen(false)
      removeLink(linkDetails.key)
    }
  }

  function renderImage() {
    const image = <img className='link-image' src={linkDetails.image} alt='Unavailable' />

    if (linkDetails.isDisabled) {
      return <div className='image-wrapper disabled-link'>{image}</div>
    } else {
      return <a className='image-wrapper' href={linkDetails.url}>{image}</a>
    }
  }

  function renderEditButton() {
    if (!editActive) { return null }

    return (
      <div
        className='edit-link'
        onClick={() => {
          setModalIsOpen(true)
          setEditActive(false)
        }}
      >
        <EditIcon color='black' />
      </div>
    )
  }
  // endregion

  // region #render
  return connectDropTarget(connectDragSource(
    <div
      style={{ opacity: isDragging ? 0 : 1 }}
      className='link'
      onMouseEnter={() => setEditActive(true)}
      onMouseLeave={() => setEditActive(false)}
    >
      {renderImage()}
      <div className='link-footer' style={{ backgroundColor: color.toHex(), color: color.contrast() }}>{linkDetails.label}</div>
      {renderEditButton()}
      <Modal
        isOpen={modalIsOpen}
        onRequestClose={() => setModalIsOpen(false)}
        style={modalStyles}
        contentLabel='Example Modal'
      >
        <div className='modal-title'>
          <div>
            <h2>{linkDetails.label || 'Enter Title'}</h2>
          </div>
          <div>
            <div onClick={() => setModalIsOpen(false)}>{CloseIcon}</div>
          </div>
        </div>
        <form onChange={event => handleFormChanges(event)}>
          <div className='form-control'>
            <label htmlFor='title'>Title</label>
            <input type='text' id='title' name='label' placeholder='Enter Title' defaultValue={linkDetails.label} />
          </div>
          <div className='form-control'>
            <label htmlFor='url'>Target Url</label>
            <input type='text' id='url' name='url' placeholder='Enter Url' defaultValue={linkDetails.url} />
          </div>
          <div className='form-control'>
            <label htmlFor='image'>Image Url</label>
            <input type='text' id='image' name='image' placeholder='Enter Image URL' defaultValue={linkDetails.image} />
          </div>
          <div className='form-control'>
            <label htmlFor='isDisabled'>Disabled</label>
            <input type='checkbox' id='isDisabled' name='isDisabled' defaultChecked={linkDetails.isDisabled} />
          </div>
          <div className='form-control'>
            <label htmlFor='color'>Color</label>
            <input type='text' id='color' name='color' placeholder='Footer Color Hex' defaultValue={linkDetails.color} />
          </div>
        </form>
        <button className='delete' onClick={handleDelete}>delete</button>
      </Modal>
    </div>
  ))
  // endregion
}

Link.propTypes = {
  index: PropTypes.number.isRequired,
  updateLink: PropTypes.func.isRequired,
  removeLink: PropTypes.func.isRequired,
  linkDetails: PropTypes.object.isRequired,
  connectDropTarget: PropTypes.func.isRequired,
  connectDragSource: PropTypes.func.isRequired,
  isDragging: PropTypes.bool.isRequired,
}

const collect = (connect, monitor) => ({ connectDragSource: connect.dragSource(), isDragging: monitor.isDragging() })
const collectDrop = (connect, monitor) => ({ connectDropTarget: connect.dropTarget() })

const linkTarget = {
  hover(props, monitor, component) {
    if (!component) { return null }
    const dragIndex = monitor.getItem().index
    const hoverIndex = props.index

    if (dragIndex === hoverIndex) { return }

    props.moveLink(dragIndex, hoverIndex)
    monitor.getItem().index = hoverIndex
  },
}

const linkSource = {
  beginDrag(props) {
    return { key: props.key, index: props.index }
  }
}

const dropTargetHOC = DropTarget('link', linkTarget, collectDrop)
const dragSourceHOC = DragSource('link', linkSource, collect)

export default dropTargetHOC(dragSourceHOC(Link))
