// https://observablehq.com/@patrickmineault/leaky-integrate-and-fire-lif-neuron-with-balanced-excitati@523
export default function define(runtime, observer) {
    const main = runtime.module();
    main.variable(observer()).define(["md"], function(md){return(
  md`# Leaky integrate-and-fire (LIF) neuron with balanced excitation and inhibition
  
  We simulate a likeay integrate-and-fire neuron. It receives excitatory and inhibitory inputs. The inputs cause the cell to *charge up* or *down* (increase or decrease its voltage). The balance of the stochastic inputs determines how the voltage changes through time: for instance, if inhibition is stronger than excitation, the voltage generally stays below 0. Once the cell voltage exceeds its threshold (=1, by convention), it emits a spike, and it is reset to 0 voltage. We plot the time course of the voltage, the spike train, as well as the inter-spike interval.
  
  In this simulation, we can change the strength of the synapses, *alpha*, the decay rate *beta*, and the rate of the synapses *excRate* and *inhRate*.
  
  [This simulation is a companion to NMA-CN day 1, tutorial 2](https://compneuro.neuromatch.io/tutorials/W1D1_ModelTypes/student/W1D1_Tutorial2.html).
  
  [Read more about integrate-and-fire models](https://neuronaldynamics.epfl.ch/online/Ch1.S3.html).
  `
  )});
    main.variable(observer("lif_neuron_ei")).define("lif_neuron_ei", ["stdlib"], function(stdlib){return(
  (nSteps, alpha, beta, excRate, inhRate, constantDrive) => {
    // Simulate a leaky integrate and fire neuron. Nothing very special here, except that
    // we use stdlib to generate Poisson variables.
    let spikeTimes = [];
    let v = 0.0;
    let exc, inh = 0.0;
    let dv = 0.0;
    let vs = [];
    for(var i = 0; i < nSteps; i++) {
      if(v == 1) {
        v = 0;
      }
      
      [exc, inh] = [excRate > 0 ? stdlib.base.random.poisson(excRate) : 0, 
                    inhRate > 0 ? stdlib.base.random.poisson(inhRate) : 0];
      dv = -beta * v + alpha * (exc - inh) + constantDrive;
      v += dv;
      
      if(v > 1) { // Fixed threshold at 1.0
        spikeTimes.push(i);
        
        // Reset the neuron;
        v = 1;
      }
      
      vs.push(v)
    }
    return [spikeTimes, vs];
  }
  )});
    main.variable(observer()).define(["md"], function(md){return(
  md`Double-check that calling lif_neuron_ei gives something reasonable`
  )});
    main.variable(observer()).define(["lif_neuron_ei","alpha","beta","excRate","inhRate"], function(lif_neuron_ei,alpha,beta,excRate,inhRate){return(
  lif_neuron_ei(1000, alpha, beta, excRate, inhRate)
  )});
    main.variable(observer()).define(["md"], function(md){return(
  md`Looks good. Now we're ready to create our simulation. The input sliders are taken care of by the observable Inputs library. The core of drawing is done by d3. d3 is a very low-level library, so this simple visualization takes many lines of code. We could replace many of this with vega-lite, which is a higher level library built on top of d3. In any case, the performance here is remarkable.`
  )});
    main.variable(observer()).define(["Inputs","set","viewof alpha","viewof beta","viewof excRate","viewof inhRate","viewof constantDrive"], function(Inputs,set,$0,$1,$2,$3,$4){return(
  Inputs.button([
    ["Reset", () => {
      set($0, .1);
      set($1, .01);
      set($2, 3);
      set($3, 3);
      set($4, 0);
    }]
  ])
  )});
    main.variable(observer("viewof alpha")).define("viewof alpha", ["Inputs"], function(Inputs){return(
  Inputs.range([0, .2], {value: .1, step: 0.01, label: "scaling (alpha)"})
  )});
    main.variable(observer("alpha")).define("alpha", ["Generators", "viewof alpha"], (G, _) => G.input(_));
    main.variable(observer("viewof beta")).define("viewof beta", ["Inputs"], function(Inputs){return(
  Inputs.range([0, .2], {value: .1, step: 0.001, label: "decay (beta)"})
  )});
    main.variable(observer("beta")).define("beta", ["Generators", "viewof beta"], (G, _) => G.input(_));
    main.variable(observer("viewof excRate")).define("viewof excRate", ["Inputs"], function(Inputs){return(
  Inputs.range([0, 20], {value: 12, step: 0.1, label: "excRate"})
  )});
    main.variable(observer("excRate")).define("excRate", ["Generators", "viewof excRate"], (G, _) => G.input(_));
    main.variable(observer("viewof inhRate")).define("viewof inhRate", ["Inputs"], function(Inputs){return(
  Inputs.range([0.0, 20], {value: 12, step: 0.1, label: "inhRate"})
  )});
    main.variable(observer("inhRate")).define("inhRate", ["Generators", "viewof inhRate"], (G, _) => G.input(_));
    main.variable(observer("viewof constantDrive")).define("viewof constantDrive", ["Inputs"], function(Inputs){return(
  Inputs.range([0.0, .1], {value: 0.0, step: 0.001, label: "constant drive"})
  )});
    main.variable(observer("constantDrive")).define("constantDrive", ["Generators", "viewof constantDrive"], (G, _) => G.input(_));
    main.variable(observer("eiChart")).define("eiChart", ["d3","maxT","width","height","lif_neuron_ei","alpha","beta","excRate","inhRate","constantDrive"], function(d3,maxT,width,height,lif_neuron_ei,alpha,beta,excRate,inhRate,constantDrive)
  {
    let margin = {top: 0, bottom: 0, left: 120, right: 300, buffer: 50};
    let x = d3.scaleLinear().domain([0, maxT]).range([margin.left, width - margin.right]);
    let y = d3.scaleLinear().domain([2, -5]).range([margin.top + 30, height - margin.bottom]);
    const svg = d3.create("svg").attr("viewBox", [0, 0, width, height]);
    const nRepeats = 1;
    //let r, u = [];
    
    let xAxis = svg.append("g")
      .attr("transform", `translate(0,${height - 50})`)
      .call(d3.axisBottom(x).ticks(10).tickSizeOuter(0))
    
    svg
      .append("g")
      .append("text")
      .attr("x", margin.left + (width - margin.left - margin.right) / 2)
      .attr("y", height - 10)
      .attr("font-size", "14px")
      .attr("text-anchor", "middle")
      .attr("fill", "black")
      .text(() => {return "Time (ms)"})
    
    svg
      .append("g")
      .append("text")
      .attr("x", width - (margin.right - margin.buffer - 10)/2 - 10)
      .attr("y", height - 10)
      .attr("font-size", "14px")
      .attr("text-anchor", "middle")
      .attr("fill", "black")
      .text(() => {return "Interval (ms)"})
      
    svg
      .append("text")
      .attr("x", 0)
      .attr("y", 18)
      .attr("text-anchor", "center")
      .attr("fill", "black")
      .text(() => {return "Spike train"})
    
    svg
      .append("text")
      .attr("x", 0)
      .attr("y", y(0) + 5)
      .attr("fill", "grey")
      .text(() => {return "0 voltage"})
    
    svg
      .append("text")
      .attr("x", 0)
      .attr("y", y(1) + 5)
      .attr("fill", "red")
      .text(() => {return "Threshold"})
    
  
    svg
      .append("text")
      .attr("x", width - (margin.right - margin.buffer - 10)/ 2 - 10)
      .attr("y", height/2 - 60)
      .attr("fill", "#69b3a2")
      .attr("text-anchor", "middle")
      .text(() => {return "Inter spike intervals"})
    
    let [r, u] = lif_neuron_ei(maxT, alpha, beta, excRate, inhRate, constantDrive);
    
    let g = svg.append("g")
    .attr("stroke", "black")
    .selectAll("g")
    .data(r)
    .join("g")
    .attr("transform", d => `translate(${x(d)})`);
  
    // Create ticks for raster plots
    g.append("line")
      .attr("y1", 0)
      .attr("y2", 20);
    
    // Create line for u(t)
    let line = d3.line()
      .x(d => x(d.x))
      .y(d => y(d.y));
    
    g = svg.append("path")
      .datum([{x: 0, y: 0}, {x: maxT, y:0}])
      .attr("stroke", "lightgrey")
      .attr("d", line)
    
    g = svg.append("path")
      .datum([{x: 0, y: 1}, {x: maxT, y:1}])
      .attr("stroke", "red")
      .attr("d", line)
    
    line = d3.line()
      .x((d, i) => x(i))
      .y((d, i) => y(d));
    
    let lineData = line(u);
    
    g = svg
      .append("path")
      .datum(u)
      .attr("d", line)
      .attr("fill", "none")
      .attr("stroke", "black")
      .attr("stroke-width", 1)
    
    // Calculate the histogram of spike timing deltas
    let deltas = [];
    for(var i = 0; i < r.length - 1; i++) {
      deltas.push(r[i+1] - r[i]);
    }
    
    x = d3.scaleLinear()
        .domain([0, 100])
        .range([width - margin.right + margin.buffer, width - 10]);
    
    svg.append("g")
        .attr("transform", "translate(0," + (height - 50) + ")")
        .call(d3.axisBottom(x));
  
    // set the parameters for the histogram
    var histogram = d3.histogram()
        .value((x) => x)   // I need to give the vector of value
        .domain(x.domain())  // then the domain of the graphic
        .thresholds(x.ticks(70)); // then the numbers of bins
  
    // And apply this function to data to get the bins
    var bins = histogram(deltas);
  
    // Y axis: scale and draw:
    y = d3.scaleLinear()
        .range([0, height / 2]);
        y.domain([0, d3.max(bins, function(d) { return d.length; })]);   // d3.hist has to be called before the Y axis obviously
    //svg.append("g")
    //    .call(d3.axisLeft(y));
  
    // append the bar rectangles to the svg element
    svg.selectAll("rect")
        .data(bins)
        .enter()
        .append("rect")
          .attr("x", 1)
          .attr("transform", function(d) { return "translate(" + x(d.x0) + "," + (height - 50 - y(d.length)) + ")"; })
          .attr("width", function(d) { return x(d.x1) - x(d.x0) -1 ; })
          .attr("height", function(d) { return y(d.length); })
          .style("fill", "#69b3a2")
    
    return svg.node();
  }
  );
    main.variable(observer("chart")).define("chart", ["d3"], function(d3)
  {
    //const svg = d3.create("svg").attr("viewBox", [0, 0, width, 200]);
    const svg = d3.create("g");
    svg.append("g").
      append("circle").
      attr("cx", 0).
      attr("cy", 0).
      attr("r", 10).
      attr("fill", "black");
  
    svg.append("g").
      append("circle").
      attr("cx", 200).
      attr("cy", 200).
      attr("r", 10).
      attr("fill", "black");
    return svg.node();
  }
  );
    main.variable(observer("eiChart2")).define("eiChart2", ["d3","maxT","width","height","lif_neuron_ei","alpha","beta","excRate","inhRate"], function(d3,maxT,width,height,lif_neuron_ei,alpha,beta,excRate,inhRate)
  {
    let margin = {top: 0, bottom: 0, left: 120, right: 300, buffer: 50};
    let x = d3.scaleLinear().domain([0, maxT]).range([margin.left, width - margin.right]);
    let y = d3.scaleLinear().domain([10, -10]).range([margin.top + 30, height - margin.bottom]);
    let w = 200;
    let h = 200;
    const svg = d3.create("svg").attr("width", w).attr("height", h).attr("viewBox", [0, 0, w, h]);
    const nRepeats = 1;
  
    svg.append("g").
      append("circle").
      attr("cx", 0).
      attr("cy", 0).
      attr("r", 10).
      attr("fill", "black");
  
    svg
      .append("g")
      .append("text")
      .attr("x", width - (margin.right - margin.buffer - 10)/2 - 10)
      .attr("y", height - 10)
      .attr("font-size", "14px")
      .attr("text-anchor", "middle")
      .attr("fill", "black")
      .text(() => {return "Interval (ms)"})
  
    svg
      .append("text")
      .attr("x", width - (margin.right - margin.buffer - 10)/ 2 - 10)
      .attr("y", height/2 - 60)
      .attr("fill", "#69b3a2")
      .attr("text-anchor", "middle")
      .text(() => {return "Inter spike intervals"})
    
    let [r, u] = lif_neuron_ei(maxT, alpha, beta, excRate, inhRate);
    
    // Calculate the histogram of spike timing deltas
    let deltas = [];
    for(var i = 0; i < r.length - 1; i++) {
      deltas.push(r[i+1] - r[i]);
    }
    
    x = d3.scaleLinear()
        .domain([0, 100])
        .range([0, w]);
    
    svg.append("g")
        .attr("transform", "translate(0," + (h - 10) + ")")
        .call(d3.axisBottom(x));
  
    // set the parameters for the histogram
    var histogram = d3.histogram()
        .value((x) => x)   // I need to give the vector of value
        .domain(x.domain())  // then the domain of the graphic
        .thresholds(x.ticks(70)); // then the numbers of bins
  
    // And apply this function to data to get the bins
    var bins = histogram(deltas);
  
    // Y axis: scale and draw:
    y = d3.scaleLinear()
        .range([0, height / 2]);
        y.domain([0, d3.max(bins, function(d) { return d.length; })]);   // d3.hist has to be called before the Y axis obviously
    //svg.append("g")
    //    .call(d3.axisLeft(y));
  
    // append the bar rectangles to the svg element
    svg.selectAll("rect")
        .data(bins)
        .enter()
        .append("rect")
          .attr("x", 1)
          .attr("transform", function(d) { return "translate(" + x(d.x0) + "," + (height - 50 - y(d.length)) + ")"; })
          .attr("width", function(d) { return x(d.x1) - x(d.x0) -1 ; })
          .attr("height", function(d) { return y(d.length); })
          .style("fill", "#69b3a2")
  
    svg.attr("id", "histogram");
    return svg;
  }
  );
    main.variable(observer("eichart3")).define("eichart3", ["d3","width","height","eiChart2"], function(d3,width,height,eiChart2)
  {
    const svg = d3.create("svg").attr("width", width).attr("height", height).attr("viewBox", [0, 0, width, height]);
    //eiChart2.attr("attr("transform", "translate(0, 0)");
    svg.node().append(eiChart2.node());
    svg.select("#eiChart2").attr("transform", "translate(0, 0)");
    return svg.node();
  }
  );
    main.variable(observer("domnode")).define("domnode", ["d3"], function(d3)
  {
    return d3.create("svg");
  }
  );
    main.variable(observer()).define(["md"], function(md){return(
  md`# Appendix`
  )});
    main.variable(observer("height")).define("height", function(){return(
  400
  )});
    main.variable(observer("maxT")).define("maxT", function(){return(
  1000
  )});
    main.variable(observer("stdlib")).define("stdlib", ["require"], function(_require){return(
  _require("https://unpkg.com/@stdlib/stdlib@0.0.32/dist/stdlib-flat.min.js")
  )});
    main.variable(observer()).define(["stdlib"], function(stdlib){return(
  stdlib
  )});
    main.variable(observer("set")).define("set", ["Event"], function(Event){return(
  function set(input, value) {
    input.value = value;
    input.dispatchEvent(new Event("input"));
  }
  )});
    return main;
  }