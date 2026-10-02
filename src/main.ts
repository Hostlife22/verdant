import { mountApplication } from './browser/application';
import { required } from './browser/dom';

mountApplication(required(document, '#main', HTMLElement));
