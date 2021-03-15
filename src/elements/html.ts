import { Chart, ChartElement } from '../chart';
import { Matrix4 } from '../geom';
import { Camera } from '../camera';

export class Html implements ChartElement {
	private _chart: Chart<any>;
	private _element: HTMLElement;
	private _attached = false;

	transform = Matrix4.identity();

	constructor(chart: Chart<any>, html?: string | HTMLElement, transform?: Matrix4) {
		this._chart = chart;
		if (html instanceof HTMLElement) {
			this._element = html;
		} else {
			this._element = document.createElement('div');
			this._element.innerHTML = html || '';
		}
		this._element.style.position = 'absolute';
		if (transform) {
			this.transform = transform;
		}
	}

	private attach() {
		if (!this._chart.container) return;
		this._chart.container.appendChild(this.element);
		this._attached = true;
	}

	get element(): HTMLElement {
		return this._element;
	}

	draw(_gl: WebGLRenderingContext, camera: Camera) {
		if (!this._attached) {
			this.attach();
			if (!this._attached) return;
		}

		const point = this.transform.transformPoint3([0, 0, 0]);
		const pixel = this._chart.pointToPixel(point);
		this._element.style.left = `${pixel[0] | 0}px`;
		this._element.style.top = `${pixel[1] | 0}px`;
	}
}
