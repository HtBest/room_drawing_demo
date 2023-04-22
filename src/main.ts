import { createApp } from 'vue'
import './style.css'
import App from './App.vue'

// createApp(App).mount('#app')
import VueKonva from 'vue-konva';

const app = createApp(App);
app.use(VueKonva);
app.mount('#app');