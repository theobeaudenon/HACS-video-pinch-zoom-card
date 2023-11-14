const pinchZoom = (imageElement,config) => {
  let imageElementScale = 1;

  let start = {};

  // Calculate distance between two fingers
  const distance = (event) => {
    return Math.hypot(event.touches[0].pageX - event.touches[1].pageX, event.touches[0].pageY - event.touches[1].pageY);
  };

  imageElement.addEventListener('touchstart', (event) => {
    console.log('touchstart', event);
    if (event.touches.length === 2) {
      event.preventDefault(); // Prevent page scroll

      // Calculate where the fingers have started on the X and Y axis
      start.x = (event.touches[0].pageX + event.touches[1].pageX) / 2;
      start.y = (event.touches[0].pageY + event.touches[1].pageY) / 2;
      start.distance = distance(event);
    }
  });

  imageElement.addEventListener('touchmove', (event) => {
    console.log('touchmove', event);
    if (event.touches.length === 2) {
      event.preventDefault(); // Prevent page scroll
      let scale;

      // Safari provides event.scale as two fingers move on the screen
      // For other browsers just calculate the scale manually
      if (event.scale) {
        scale = event.scale;
      } else {
        const deltaDistance = distance(event);
        scale = deltaDistance / start.distance;
      }

      imageElementScale = Math.min(Math.max(1, scale), 4);

      // Calculate how much the fingers have moved on the X and Y axis
      const deltaX = (((event.touches[0].pageX + event.touches[1].pageX) / 2) - start.x) * 2; // x2 for accelarated movement
      const deltaY = (((event.touches[0].pageY + event.touches[1].pageY) / 2) - start.y) * 2; // x2 for accelarated movement

      // Transform the image to make it grow and move with fingers
      const transform = `translate3d(${deltaX}px, ${deltaY}px, 0) scale(${imageElementScale})`;
      imageElement.style.transform = transform;
      imageElement.style.WebkitTransform = transform;
      imageElement.style.zIndex = "9999";
    }
  });

  imageElement.addEventListener('touchend', (event) => {
    if(config.autoZoomOut =='1'){
      console.log('touchend', event);
      // Reset image to it's original format
      imageElement.style.transform = "";
      imageElement.style.WebkitTransform = "";
      imageElement.style.zIndex = "";
    }

  });
}



const LitElement = Object.getPrototypeOf(
    customElements.get("ha-panel-lovelace")
  );
  const html = LitElement.prototype.html;
  const css = LitElement.prototype.css;


// First we need to make some changes to the custom card class
class VideoPinchZoomCard extends LitElement {
  static getConfigElement() {
    // Create and return an editor element
    return document.createElement("hacs-video-pinch-zoom-card-editor");
  }

  static getStubConfig() {
    return { entity: "" };
  }

   static get properties() {
    return {
      hass: {},
      _config: {},
    };
  }

  setConfig(config) {
    this._config = config;
  }

  render() {
    if (!this.hass || !this._config) {
      return html``;
    }
    

    const cameraObj = this.hass.states[this._config.entity];
    if (!cameraObj) {
      return html` <ha-card>Unknown entity: ${this._config.entity}</ha-card> `;
    }

    return html`
    <div class="mainImage" >
         <div id="pinchZoom"  >
          <ha-camera-stream id="cameraStream"
            .hass=${this.hass}
            .stateObj="${cameraObj}"
          ></ha-camera-stream>
         </div>
      
    </div>
    `;
  }

  updated(changedProperties) {
     

    window.setTimeout(() => {
        let el = this.shadowRoot.getElementById('pinchZoom');
        pinchZoom(el,this._config);
    }, 1000);
     
    }


}


class VideoPinchZoomCardEditor extends LitElement {

  static get properties() {
    return {
      hass: {},
      _config: {},
    };
  }

  setConfig(config) {
    this._config = config;
  }

  entityChanged(ev) {

    console.log(ev);
    // We make a copy of the current config so we don't accidentally overwrite anything too early
    const _config = Object.assign({}, this._config);
    // Then we update the entity value with what we just got from the input field
    _config.entity = ev.detail.value.entity;
    _config.autoZoomOut = ev.detail.value.autoZoomOut;
    
    // And finally write back the updated configuration all at once
    this._config = _config;
    console.log(this._config);

    const event = new CustomEvent("config-changed", {
      detail: { config: _config },
      bubbles: true,
      composed: true,
    });
    this.dispatchEvent(event);
  }

  render() {
    if (!this.hass || !this._config) {
      return html``;
    }
    if (this._config.autoZoomOut == null) {
      this._config.autoZoomOut = "1";
    }

    return html`
    <ha-form
    .hass=${this.hass}
    .data=${this._config}
    .schema=${[
      {name: "entity", selector: { entity: { domain: "camera" } }}  ,
      {name: "autoZoomOut", selector: { select: { required: true,multiple: false, mode: "list", options: [
          {label: "Automatically puts the video back in the frame", value: "1"},
          {label: "Keeps zoom when pinch is out", value: "2"}
          ]
        }}}
    ]}
    .computeLabel=${this._computeLabel}
    @value-changed=${this.entityChanged} 
    ></ha-form>
  `;
  }
}

customElements.define("hacs-video-pinch-zoom-card-editor", VideoPinchZoomCardEditor);
customElements.define("hacs-video-pinch-zoom-card", VideoPinchZoomCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "hacs-video-pinch-zoom-card",
  name: "Video pinch Zoom Card",
  description: "Display your video stream and let you zoom on mobile",
});
