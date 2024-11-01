import { NodeEditor, GetSchemes, ClassicPreset } from "rete";
import { AreaPlugin, AreaExtensions } from "rete-area-plugin";
import {
  ConnectionPlugin,
  Presets as ConnectionPresets,
} from "rete-connection-plugin";
import { LitPlugin, Presets, LitArea2D } from "@retejs/lit-plugin";
import { css, html, LitElement } from "lit";
import "@kor-ui/kor/components/button";
import "@kor-ui/kor/components/progress-bar";
import "@kor-ui/kor/kor-styles.css";

class Node extends ClassicPreset.Node<
  { [key in string]: ClassicPreset.Socket },
  { [key in string]: ClassicPreset.Socket },
  {
    [key in string]:
      | ButtonControl
      | ProgressControl
      | ClassicPreset.Control
      | ClassicPreset.InputControl<"number">
      | ClassicPreset.InputControl<"text">;
  }
> {}
class Connection<
  A extends Node,
  B extends Node
> extends ClassicPreset.Connection<A, B> {}

type Schemes = GetSchemes<Node, Connection<Node, Node>>;
type AreaExtra = LitArea2D<any>;

class ButtonControl extends ClassicPreset.Control {
  constructor(public label: string, public onClick: () => void) {
    super();
  }
}

class ProgressControl extends ClassicPreset.Control {
  constructor(public percent: number) {
    super();
  }
}

class CustomButton extends LitElement {
  static get properties() {
    return {
      data: { type: ButtonControl },
    };
  }

  declare data: ButtonControl;

  render() {
    return html`
      <style>
        .button {
          color: black;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
            "Helvetica Neue", Arial, "Noto Sans", sans-serif,
            "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol",
            "Noto Color Emoji";
          font-weight: 400;
        }
        .button: hover {
          color: #4096ff;
        }
      </style>
      <kor-button
        label=${this.data.label}
        @pointerdown=${(e: MouseEvent) => e.stopPropagation()}
        @doubleclick=${(e: MouseEvent) => e.stopPropagation()}
        @click=${this.data.onClick}
        class="button"
      ></kor-button>
    `;
  }
}

class CustomProgress extends LitElement {
  static get properties() {
    return {
      data: { type: ProgressControl },
    };
  }

  declare data: ProgressControl;

  static styles = css`
    :host {
      width: 100%;
      display: flex;
      flex-direction: column;
    }
    :host([radial]) {
      align-items: center;
      justify-content: center;
    }
    .radial-wrapper {
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
    }
    .radial-wrapper kor-text {
      position: absolute;
      width: 100%;
      text-align: center;
    }
    .radial {
      transform: rotate(-90deg);
    }
    circle {
      fill: transparent;
      stroke-width: 8px;
    }
    .text {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
        "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji",
        "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji";
      font-weight: 400;
      font-size: 24px;
    }
  `;

  get value() {
    return this.data.percent;
  }

  getSize() {
    return 120;
  }

  render() {
    return html`
      <div class="radial-wrapper">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="radial"
          width="${this.getSize()}"
          viewBox="0 0 ${this.getSize()} ${this.getSize()}"
        >
          <circle
            stroke="rgba(var(--neutral-1), .1)"
            r="${this.getSize() / 2 - 4}"
            cx="${this.getSize() / 2}"
            cy="${this.getSize() / 2}"
          />
          <circle
            stroke="rgb(var(--accent-1))"
            stroke-dasharray="${2 * Math.PI * (this.getSize() / 2 - 4)}"
            stroke-dashoffset="${2 *
            Math.PI *
            (this.getSize() / 2 - 4) *
            (1 - (this.value ? this.value / 100 : 0))}"
            r="${this.getSize() / 2 - 4}"
            cx="${this.getSize() / 2}"
            cy="${this.getSize() / 2}"
          />
        </svg>
        <kor-text class="text">${this.value}%</kor-text>
      </div>
    `;
  }
}

customElements.define("custom-button", CustomButton);
customElements.define("custom-progress", CustomProgress);

export async function createEditor(container: HTMLElement) {
  const socket = new ClassicPreset.Socket("socket");

  const editor = new NodeEditor<Schemes>();
  const area = new AreaPlugin<Schemes, AreaExtra>(container);
  const connection = new ConnectionPlugin<Schemes, AreaExtra>();
  const render = new LitPlugin<Schemes, AreaExtra>();

  render.addPreset(
    Presets.classic.setup({
      customize: {
        control(data) {
          if (data.payload instanceof ButtonControl) {
            const { payload } = data;

            return () => html`<custom-button .data=${payload}></custom-button>`;
          }
          if (data.payload instanceof ProgressControl) {
            const { payload } = data;
            return () =>
              html`<custom-progress .data=${payload}></custom-progress>`;
          }
          if (data.payload instanceof ClassicPreset.InputControl) {
            const { payload } = data;
            return () => html`<rete-control .data=${payload}></rete-control>`;
          }
          return () => null;
        },
      },
    })
  );
  connection.addPreset(ConnectionPresets.classic.setup());

  editor.use(area);
  area.use(connection);
  area.use(render);

  const a = new Node("A");
  a.addOutput("a", new ClassicPreset.Output(socket));

  const progressControl = new ProgressControl(0);
  const inputControl = new ClassicPreset.InputControl("number", {
    initial: 0,
    change(value) {
      progressControl.percent = value;
      area.update("control", progressControl.id);
    },
  });

  a.addControl("input", inputControl);
  a.addControl("progress", progressControl);
  a.addControl(
    "button",
    new ButtonControl("Randomize", () => {
      const percent = Math.round(Math.random() * 100);

      inputControl.setValue(percent);
      area.update("control", inputControl.id);

      progressControl.percent = percent;
      area.update("control", progressControl.id);
      console.log("ButtonControl", percent);
    })
  );
  await editor.addNode(a);

  AreaExtensions.zoomAt(area, editor.getNodes());

  return {
    destroy: () => area.destroy(),
  };
}
