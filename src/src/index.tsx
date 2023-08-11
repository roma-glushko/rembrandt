import { render } from 'preact';

import Painter from "./painter";

import './style.css';

export function App() {
	return (
		<div>
			<h1>Rembrandt</h1>
			<Painter />
		</div>
	);
}

render(<App />, document.getElementById('app'));
