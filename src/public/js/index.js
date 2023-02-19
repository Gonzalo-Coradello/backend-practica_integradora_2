const socket = io()

let user = ''
const chatBox = document.getElementById('chatbox')
const logsDiv = document.getElementById('messageLogs')

Swal.fire({
    title: 'Identificate',
    input: 'text',
    text: 'Ingrese su correo electrónico',
    inputValidator: value => {
        return !value.trim() && 'Por favor ingrese un correo electrónico'
    },
    allowOutsideClick: false
}).then( result => {
    user = result.value
    document.getElementById('username').innerHTML = user + ':'
})

// Enviar mensajes
chatBox.addEventListener('submit', (e) => {
    e.preventDefault()

    let msg = e.target.elements.msg.value

    socket.emit('chatMessage', {user, msg})

    e.target.elements.msg.value = ''
    e.target.elements.msg.focus()
})

// Recibir mensajes

socket.on('message', obj => {
    outputMessage(obj)
    logsDiv.scrollTop = logsDiv.scrollHeight
})

function outputMessage({ user, msg }) {
    const div = document.createElement('div')
    div.innerHTML = `<p><i>${user}: </i>${msg}</p>`
    logsDiv.appendChild(div)
}