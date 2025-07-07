import { createElement } from 'lwc';
import App from 'dina/app';

const elm = createElement('dina-app', { is: App });
document.body.appendChild(elm);