// https://observablehq.com/@patrickmineault/dynamics-of-sparsely-connected-networks-of-inhibitory-and@910
export default function define(runtime, observer) {
    const main = runtime.module();
    main.variable(observer()).define(["md"], function(md){return(
  md`# Dynamics of sparsely connected networks of inhibitory and excitatory neurons
  
  Simple artificial spiking neuron models subjected to constant input show regular firing patterns. Yet, real neurons in the brain can show highly irregular firing patterns. A resolution to this paradox, first proposed forward by Vreeswijk and Sompolinsky (1996), is that noise in neuronal firing patterns emerges from the interaction of balanced excitatory and inhibitory inputs. 
  
  [Brunel (2000)](https://link.springer.com/article/10.1023/A:1008925309027) analyzes a system of sparsely connected excitatory and inhibitory cells, modeled by linear integrate-and-fire neurons. This system of cells is assumed driven by a constant input. He finds that such a system can display a wide range of behaviours, from irregularly firing to synchronously firing. Although the parameter space of the system considered is large, he boils down the response of the system to two intuitive parameters: 
  
  * *g*, the balance of inhibition to excitation
  * *v_ext/v_thr*, the ratio of the strength of the external input to the minimum threshold to make a neuron fire in the absence of feedback
  
  Let's simulate Brunel's system A. We'll need to create a few helper functions to do this.`
  )});
    main.variable(observer("range")).define("range", function(){return(
  function range(x) {
    // Similar to Python's range function.
    let a = [];
    for(var i = 0; i < x; i++) {
      a.push(a);
    }
    return a;
  }
  )});
    main.variable(observer("randomSelection")).define("randomSelection", function(){return(
  (l, r, nSel) => {
    // Random choice without replacement between l and r (includes l, excludes r).
    // Used to compute random connections.
    let e = new Object();
    for(var i = l; i < r; i++) {
      e[i] = i;
    }
    let selection = [];
    for(var i = 0; i < nSel; i++) {
      let el;
      while(1) {
        el = l + Math.ceil(Math.random() * (r - l - i));
        if(e[el] != null){
          break;
        }
      }
      selection.push(e[el])
      delete e[el];
    }
    return selection;
  }
  )});
    main.variable(observer()).define(["md"], function(md){return(
  md`Here the simulation is not instantaneous (~several seconds). To maintain performance, we use *yield*. This allows us to give the drawing subsystem a short amount of data to draw at one time, so we can instantaneously update the graphics and fill them in, left to right. Thus, although the total simulation time is a bit longer, it *feels* far more responsive.`
  )});
    main.variable(observer("lif_system_a")).define("lif_system_a", ["range","randomSelection","stdlib"], function(range,randomSelection,stdlib){return(
  function* lif_system_a(nSteps, g, v_ext_v_thr) {
    // Simulate a system of leaky integrate-and-fire neurons. 
    // This is slightly annoying. Having a higher level framework (e.g. Brian) would certainly be helpful.
    
    // We use constants suggested by Brunel (2000), section 2.
    // For simplicity, we simulate with a granularity of 1 ms.
    const N = 1000;
    const N_E = 0.8 * N;
    const N_I = 0.2 * N;
    const tau_E = 20;
    const theta = 20;
    const V_r = 10;
    const D = 2; // Delay.
    const rp = 3; // refractory period.
    const C_ext = 1;
    const J = 0.1; // mV, as in Figure 8.
    
    // Proportion of active connections.
    const eps = 0.1;
    
    // Using a slightly different definition than Brunel (2000) because I'm 
    // assuming one big external synapse.
    let v_thr = theta / (J * tau_E);
    let v_ext = v_ext_v_thr * v_thr;
    
    console.log(v_thr);
    console.log(v_ext);
    console.log(v_ext_v_thr);
    
    // Initialize empty arrays for each neuron.
    let spikeTimes = range(N).map((x) => new Array());
    let totalSpikes = (new Array(Math.max(D, rp))).fill(0);
  
    // Because the memory overhead of using js' default float64s is substantial, we use typed uint8 arrays
    // which let us decrease the memory overhead by 8x. We could go down another 8x by packing
    // 8 time steps to a byte, but let's not go nuts just yet.
    
    // Here we encounter some of JS' limitations: there's no first class matrix object.
    // Conceptually, we just want to take slices rasters[:, t-D], but we have to think
    // about memory layout for this to be straightforward.
    let rasters = range(nSteps).map(x => new Uint8Array(N));
    let vs = new Uint8Array(N);
    
    // Let's generate random connections.
    let connE = [];
    let connI = [];
    for(var i = 0; i < N; i++) {
      connE.push(randomSelection(0, N_E, eps * N_E));
      connI.push(randomSelection(N_E, N, eps * N_I));
    }
    
    let exc, inh = 0.0;
    
    for(let i = Math.max(D, rp); i < nSteps; i++) {
      let newSpikeTimes = range(N).map((x) => new Array());
      let sumSpikes = 0;
      for(let j = 0; j < N; j++) {
        // Random external drive. This looks a bit strange, but it means
        // that v_thr = theta / (J C_ext tau)
        let driveExt = stdlib.base.random.poisson(v_ext);
        //let driveExt = v_ext * C_ext;
        
        // Sum up contributions from all the synaptic currents, delayed.
        // Note that the inhibitory inputs are scaled by a factor g.
        // Note that we use a reduce function to implement the sum.
        let drive = connE[j].map(x => rasters[i - D][x]).reduce((a, b) => a + b, 0) + 
               -g * connI[j].map(x => rasters[i - D][x]).reduce((a, b) => a + b, 0);
        
        let RI = J * (
                  drive + 
                  driveExt);
        
        // equation 1.
        let dv = - vs[j] / tau_E + RI;
        vs[j] += dv;
        
        // If there was a recent spike, override.
        if(rasters[i - 1][j] == 1) {
          if(rasters[i - D][j] == 0) {
            vs[j] = V_r;
            rasters[i][j] = 1;
          }
        }
        
        if(vs[j] > theta) {
          // A spike has been generated
          spikeTimes[j].push(i);
          newSpikeTimes[j].push(i);
          rasters[i][j] = 1;
          vs[j] = V_r;
          sumSpikes += 1;
        }
      }
      
      totalSpikes.push(sumSpikes / N);
      
      yield [newSpikeTimes, totalSpikes];
    }
  }
  )});
    main.variable(observer()).define(["md"], function(md){return(
  md`Let's create a custom selection widget to allow us to move within the parameter space from Brunel (2000). There's only a slight amount of *observable* magic to enable compatibility with the viewof operator; otherwise, it is quite similar to vanilla d3.`
  )});
    main.variable(observer()).define(["Inputs","set","viewof selectionWidget"], function(Inputs,set,$0){return(
  Inputs.button([
    ["Reset", () => {
      set($0, [4, 10, new Date()]);
    }]
  ])
  )});
    main.variable(observer()).define(["md"], function(md){return(
  md`**Drag the circle to change the parameters of the simulation and re-run it**`
  )});
    main.variable(observer("viewof selectionWidget")).define("viewof selectionWidget", ["d3","selSize","x","y","drag","pad"], function(d3,selSize,x,y,drag,pad)
  {
    // We use a small amount of observable-specific magic here: we create a view using the viewof
    // operator.
    let svg = d3.create("svg")
                .attr("viewBox", [0, 0, selSize, selSize])
                .attr("width", selSize)
                .attr("height", selSize);
    
    let background = svg.append("rect")
      .attr("x", 0)
      .attr("y", 0)
      .attr("width", selSize)
      .attr("height", selSize)
      .attr("fill", '#fff')
      .on("mouseup", (event) => {
        node.value = [x.invert(event.layerX), y.invert(event.layerY), new Date()];
        node.dispatchEvent(new CustomEvent("input"))
      });
    
    let selection = svg
      .append("circle")
      .attr("cx", x(4))
      .attr("cy", y(10))
      .attr("r", 10)
      .attr("fill", "#fff")
      .attr("stroke", "#000")
      .attr("stroke-width", "2")
      .call(drag);
    
    selection.on("mouseover", () => {selection.attr("stroke-width", 4)});
    selection.on("mouseout", () => {selection.attr("stroke-width", 2)});
    
    // Now create two axes corresponding to the two parameters, similar to Figure 7.
    let xAxis = d3.axisBottom().scale(x).ticks(5);
    let yAxis = d3.axisLeft().scale(y).ticks(5);
    
    let g = svg.append("g")
      .attr("transform", `translate(0, ${selSize - pad})`)
      .call(xAxis);
    g.append("text")
      .attr("fill", "#000")
      .attr("x", x(4))
      .attr("y", 25)
      .attr("font-weight", "bold")
      .text("g")
    
    g = svg.append("g")
        .attr("transform", `translate(${pad}, 0)`).call(yAxis);
    
    g.append("text")
      .attr("fill", "#000")
      .attr("transform", `translate(-20 ${y(10) - pad}) rotate(-90)`)
      .attr("font-weight", "bold")
      .text("v_ext/v_thr");
    
    // To make this circle draggable, we could use low level JS events (painful)
    // or we could use high-level d3 events (fun!).
    svg.attr("id", "selectionWidget");
    let node = svg.node()
    
    let value = [5, 10, new Date()];
    Object.defineProperty(node, "value", {
      get() {
        return value;
      },
      set(v) {
        value = v;
        selection.attr("cx", x(value[0]));
        selection.attr("cy", y(value[1]));
      }
    });
    
    node.value = value;
    return svg.node();
  }
  );
    main.variable(observer("selectionWidget")).define("selectionWidget", ["Generators", "viewof selectionWidget"], (G, _) => G.input(_));
    main.variable(observer("canvas")).define("canvas", ["d3","width","height","lif_system_a","g_val","v_ext"], function*(d3,width,height,lif_system_a,g_val,v_ext)
  {
    // The only part of d3 we're really using here is the linear scaling.
    // We use canvas for efficiency - this allows us not to have to create thousands of nodes
    // for lines.
    let padding = 50;
    const holder = d3.create("div");
    const canvas = holder.append("canvas").attr("width", width).attr("height", height + padding);
    
    let context = canvas
      .node()
      .getContext('2d', { alpha: false });
    
    // Redraw everything.
    context.fillStyle = '#fff';
    context.fillRect(0, 0, width, height + padding);
    context.fillStyle = '#000';
    
    let maxT = 250;
    const maxN = 100;
    const legendSpace = 100;
    
    let x = d3.scaleLinear().domain([0, maxT]).range([0, width - legendSpace]);
    let y = d3.scaleLinear().domain([0, maxN]).range([0, height]);
    
    context.fillStyle = "#f00"
    context.font = "16px serif";
    context.fillText("Excitatory", 0, 20);
    
    context.fillStyle = "#00f"
    context.fillText("Inhibitory", 0, y(maxN * .8 + 1));
    
    context.fillStyle = "#000"
    context.fillText("Total spikes", 0, height + padding - 8);
    
    context.translate(legendSpace, 0);
    
    let results = lif_system_a(maxT, g_val, v_ext);
    
    while(1) {
      // Grab one step's worth of data.
      let frame = results.next().value;
      if(frame == null) {
        break;
      }
      let [r, totalSpikes] = frame;
  
      let hr = y(1) - y(0);
      let wr = Math.round(Math.ceil(x(1) - x(0), 1));
      for(var i = 0; i < maxN; i++) {
        let j = i;
        if(i < maxN * .8) {
          context.fillStyle = '#f00';
        } else {
          j = (r.length * .8) + (i - maxN * .8);
          context.fillStyle = '#00f';
        }
        
        // Note that I round x(d) to get nice crisp ticks.
        r[j].forEach((d) => {
          return context.fillRect(Math.round(x(d)), y(i), 1, hr);
        });
      }
      // Draw a gray line to indicate what's happening
      context.fillStyle = "#999";
      context.fillRect(Math.round(x(totalSpikes.length)) + 1, 0, 1, height + legendSpace);
      context.fillStyle = "#fff";
      context.fillRect(Math.round(x(totalSpikes.length-1))+1, 0, 1, height + legendSpace);
      
      // Draw a total spikes histogram at the bottom.
      context.save();
      context.translate(0, height + padding);
      context.scale(1, -1);
      context.fillStyle = "#000";
      
      context.beginPath();
      context.moveTo(x(0), 0);
      totalSpikes.forEach((n, i) => context.lineTo(x(i), padding * n));
      context.lineTo(x(totalSpikes.length - 1), y(0));
      context.closePath();
      context.fill();
      context.restore();
      
      // I yield the results immediately, allowing the data to be displayed instantaneously.
      yield holder.node();
    }
  }
  );
    main.variable(observer("x")).define("x", ["d3","pad","selSize"], function(d3,pad,selSize){return(
  d3.scaleLinear().domain([0, 8]).range([pad, selSize - pad])
  )});
    main.variable(observer("y")).define("y", ["d3","pad","selSize"], function(d3,pad,selSize){return(
  d3.scaleLinear().domain([20, 0]).range([pad, selSize - pad])
  )});
    main.variable(observer("selSize")).define("selSize", function(){return(
  200
  )});
    main.variable(observer("pad")).define("pad", function(){return(
  30
  )});
    main.variable(observer("drag")).define("drag", ["d3","x","y"], function(d3,x,y)
  {
    function dragstarted() {
      d3.select(this).attr("stroke-width", 4);
    }
  
    function dragged(event, d) {
      d3.select(this).attr("cx", event.x).attr("cy", event.y);
      let widget = d3.select("#selectionWidget").node();
      let [a, b, oldT] = widget.value;
      
      // Debounce.
      if(((new Date()) - oldT) > 200) {
        widget.value = [x.invert(event.x), y.invert(event.y), (new Date())];
        widget.dispatchEvent(new CustomEvent('input', {bubbles: true}));
      } else {
        widget.value = [x.invert(event.x), y.invert(event.y), oldT];
      }
    }
  
    function dragended() {
      d3.select(this).attr("stroke-width", 2);
    }
  
    return d3.drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended);
  }
  );
    main.variable(observer()).define(["md"], function(md){return(
  md`# Appendix`
  )});
    main.variable(observer("height")).define("height", function(){return(
  300
  )});
    main.variable(observer("viewof v_ext")).define("viewof v_ext", ["d3","selectionWidget"], function(d3,selectionWidget)
  {
    let a = d3.create("div");
    a.append("p").text("v_ext dummy view");
    a.node().value = selectionWidget[1];
    return a.node();
  }
  );
    main.variable(observer("v_ext")).define("v_ext", ["Generators", "viewof v_ext"], (G, _) => G.input(_));
    main.variable(observer("viewof g_val")).define("viewof g_val", ["d3","selectionWidget"], function(d3,selectionWidget)
  {
    let a = d3.create("div");
    a.append("p").text("g_val dummy view");
    a.node().value = selectionWidget[0];
    return a.node();
  }
  );
    main.variable(observer("g_val")).define("g_val", ["Generators", "viewof g_val"], (G, _) => G.input(_));
    main.variable(observer("maxT")).define("maxT", function(){return(
  100
  )});
    main.variable(observer("stdlib")).define("stdlib", ["require"], function(_require){return(
  _require("https://unpkg.com/@stdlib/stdlib@0.0.32/dist/stdlib-flat.min.js")
  )});
    main.variable(observer("set")).define("set", ["Event"], function(Event){return(
  function set(input, value) {
    input.value = value;
    input.dispatchEvent(new Event("input"));
  }
  )});
    return main;
  }