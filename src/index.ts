import { createEditor } from "./editor";
import "./styles.css";

document.getElementById("app")!.innerHTML = `
  <div id="rete"></div>
`;
createEditor(document.querySelector("#rete")!);
