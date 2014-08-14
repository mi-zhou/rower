var DIV_WIDTH = 950, DIV_HEIGHT = 530;
var MARGIN = {top: 20, right: 180, bottom: 30, left: 40};
var HEATMARGIN = {top: 160, right: 20, bottom: 60, left: 160};

var G_PLOT,G_HEAT;
var G_LEGEND,G_ERRORBAR,G_DATAPT,G_MEDIANPT,G_LINE,G_BAR,G_BOX,G_AXIS;
var G_HEATGRID, G_HEATXLBL, G_HEATYLBL, G_HEATLEGEND, G_HEATDENDRO;

var WIDTH,HEIGHT,HEATWIDTH,HEATHEIGHT;
var X_SCALE,Y_SCALE;
var X_AXIS;var Y_AXIS;
var COLOR_ARR;

function svg_init(){
  WIDTH = DIV_WIDTH - MARGIN.left - MARGIN.right,
  HEIGHT = DIV_HEIGHT - MARGIN.top - MARGIN.bottom;
  HEATWIDTH = DIV_WIDTH - HEATMARGIN.left - HEATMARGIN.right,
  HEATHEIGHT = DIV_HEIGHT - HEATMARGIN.top - HEATMARGIN.bottom;
  X_SCALE = d3.scale.ordinal().rangeRoundBands([0, WIDTH],0.1);
  Y_SCALE = d3.scale.linear().range([HEIGHT, 0]);
  COLOR_ARR = ['','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','',''];
  
  X_AXIS = d3.svg.axis().scale(X_SCALE).orient("bottom");
  Y_AXIS = d3.svg.axis().scale(Y_SCALE).orient("left");
  
  svg = d3.select("#svg_area").append("svg").attr("width",DIV_WIDTH).attr("height",DIV_HEIGHT);
  G_PLOT = svg.append("g").attr("id","g_plot").attr("transform","translate("+MARGIN.left+","+MARGIN.top+")");
  G_HEAT = svg.append("g").attr("id","g_heat").attr("transform","translate("+HEATMARGIN.left+","+HEATMARGIN.top+")");;
  svg.append("svg:image").attr("xlink:href","images/ajax-loader.gif")
    .attr("x",DIV_WIDTH/2-24).attr("y",DIV_HEIGHT/2-24).attr("height",48).attr("width",48)
    .attr("id","loadingicon").attr("display","none");
  
  G_LEGEND = G_PLOT.append("g").attr("id","g_legend");
  G_DATAPT = G_PLOT.append("g").attr("id","g_datapt");
  G_LINE = G_PLOT.append("g").attr("id","g_line");
  G_MEDIANPT = G_PLOT.append("g").attr("id","g_medianpt");
  G_BAR = G_PLOT.append("g").attr("id","g_bar");
  G_BOX = G_PLOT.append("g").attr("id","g_box");
  G_ERRORBAR = G_PLOT.append("g").attr("id","g_errorbar");
  G_PERCLINE = G_PLOT.append("g").attr("id","g_percline");
  G_AXIS = G_PLOT.append("g").attr("id","g_axis");
  
  G_AXIS.append("g").attr("class", "x axis text").attr("transform", "translate(0," + HEIGHT + ")")
  G_AXIS.append("g").attr("class", "y axis text")
    .append("text").attr("class","ylabel").attr("transform", "rotate(-90)").attr("y", 6).attr("dy", ".71em").style("text-anchor", "end");
  G_AXIS.append("path").attr("class","zeroline");
    
  G_HEATGRID = G_HEAT.append("g").attr("id","g_heatgrid");
  G_HEATXLBL = G_HEAT.append("g").attr("id","g_heatxlbl");
  G_HEATYLBL = G_HEAT.append("g").attr("id","g_heatylbl");
  G_HEATLEGEND = G_HEAT.append("g").attr("id","g_heatlegend");
  G_HEATDENDRO = G_HEAT.append("g").attr("id","g_heatdendro");
    
  updatePlotType();
}

function loadingicon(option){
  switch(option){
  case 'ajaxstart':
    d3.selectAll("#loadingicon").attr("display","inline");
    break;
  case 'ajaxstop':
    d3.selectAll("#loadingicon").attr("display","none");
    break;
  }
}

function fs_color(fs_name, f_name){
  colors = ['#e6b4ac', '#e57e39', '#e59900', '#dae639', '#50e639', '#39e6c3', '#0099e6', '#accbe6', '#a173e6', '#d600e6',
            '#e60099', '#e6accb', '#e5005c', '#b3a486', '#89b359', '#2daab3', '#2d50b3', '#8c86b3', '#4700b3', '#b359a1',
            '#b20018', '#b25965', '#806860', '#208060', '#663333', '#4d1a66', '#661a42', '#593000', '#535900', '#4c4526', 
            '#2b4d26', '#264a4d', '#26364d', '#401a00', '#001140'];
  var clr_ind = COLOR_ARR.indexOf(fs_name+''+f_name);
  if(clr_ind==-1){
    clr_ind = COLOR_ARR.indexOf('');
    COLOR_ARR[clr_ind] = fs_name+''+f_name;
    //console.log("NEW CLR:"+COLOR_ARR[clr_ind]+", "+colors[clr_ind]);
  }
  return colors[clr_ind];
}

function linearizeTree(tree, treeArr,treeorder){
  //childheight_L, childheight_R, selfheight, position_L, position_R
  var l_height, r_height, s_height, l_pos, r_pos;
  if(_.isArray(tree[0])){
    linearizeTree(tree[0], treeArr, treeorder);
    l_height = tree[0][2];
    l_pos = (treeArr[treeArr.length-1][3]+treeArr[treeArr.length-1][4])/2;
  }else{
    l_height = 0;
    l_pos = treeorder.indexOf(tree[0]);
  }
  if(_.isArray(tree[1])){
    linearizeTree(tree[1], treeArr, treeorder);
    r_height = tree[1][2];
    r_pos = (treeArr[treeArr.length-1][3]+treeArr[treeArr.length-1][4])/2;
  }else{
    r_height = 0;
    r_pos = treeorder.indexOf(tree[1]);
  }
  s_height = tree[2];
  treeArr[treeArr.length] = [l_height, r_height, s_height, l_pos, r_pos];
  //console.log(treeArr[treeArr.length-1]);
  return treeArr;
}

function updatePlotType(){
  SHOWDATAPT ? G_DATAPT.attr("display","inline") : G_DATAPT.attr("display","none");
  SHOWERRBAR ? G_ERRORBAR.attr("display","inline") : G_ERRORBAR.attr("display","none");
  SHOWPERC&&!MEANCENT ? G_PERCLINE.attr("display","inline") : G_PERCLINE.attr("display","none");
  if(SHOWDENDRO && CLUSTERX){
    G_HEATDENDRO.attr("display","inline");
    G_HEATXLBL.attr("display","none");
  }else{
    G_HEATDENDRO.attr("display","none");
    G_HEATXLBL.attr("display","inline");
  }
  switch(PLOT_TYPE){
  case 'div_lineplot':
    d3.selectAll("#g_heat,#g_bar,#g_box").attr("display","none");
    d3.selectAll("#g_plot,#g_line,#g_medianpt").attr("display","inline");
    break;
  case 'div_barplot':
    d3.selectAll("#g_heat,#g_line,#g_medianpt,#g_box,#g_datapt").attr("display","none");
    d3.selectAll("#g_plot,#g_bar").attr("display","inline");
    break;
  case 'div_boxplot':
    d3.selectAll("#g_heat,#g_line,#g_medianpt,#g_bar,#g_errorbar").attr("display","none");
    d3.selectAll("#g_plot,#g_box").attr("display","inline");
    break;
  case 'div_heatmap':
    d3.selectAll("#g_plot").attr("display","none");
    d3.selectAll("#g_heat").attr("display","inline");
    break;
  
  default:
    d3.selectAll("#g_heat,#g_bar,#g_box").attr("display","none");
    d3.selectAll("#g_plot,#g_line,#g_medianpt").attr("display","inline");
    break;
  }
}

function updatePlot(data,tree){

  if(FS_TORMV.length>0){
    _.each(FS_TORMV, function(d){
      //allow the color to be used by another fs
      for(i=0; i<COLOR_ARR.length; i++){
        if(COLOR_ARR[i].length>=d.length && COLOR_ARR[i].substring(0,d.length) == d){
          //console.log("RMV CLR:"+COLOR_ARR[i]+", "+i);
          COLOR_ARR[i] = '';
        }
      }
    });
  }
  
  //[sg_labels, fs_labels, datapoints, statistics, p_values]
  var sgcount = data[0].length;
  var fscount = data[1].length;
  
  var datapoints = []; //[sg_ind, fs_ind, value]
  var datastruct = []; //[sg_ind, fs_ind, min, 25p, 50p, 75p, max, std]
  var treeorder = _.reject(_.flatten(tree), function(d){ return d % 1 !== 0; });
  for(i=0; i<fscount; i++){
    for(j=0; j<sgcount; j++){
      datastruct[datastruct.length] = 
        [j,i,data[3][i][j][0],data[3][i][j][1],data[3][i][j][2],data[3][i][j][3],data[3][i][j][4],data[3][i][j][5],data[0][j]+data[1][i][1],treeorder.indexOf(i)];
      for(k=0; k<data[2][i][j].length; k++){
        datapoints[datapoints.length] = [j,i,data[2][i][j][k],data[0][j]+data[1][i][1]+k];
      }
    }
  }
  var treelinear = (data[1].length == 1) ? [] : linearizeTree(tree,[],treeorder);
  
  //plot axis
  X_SCALE.domain(data[0]);
  var min_y = d3.min(datapoints, function(d) { return d[2];});
  var max_y = d3.max(datapoints, function(d) { return d[2];});
  Y_SCALE.domain([min_y-(max_y-min_y)*0.1,max_y+(max_y-min_y)*0.1]);
  G_AXIS.selectAll(".x.axis").transition().duration(1000).call(X_AXIS);
  G_AXIS.selectAll(".y.axis").transition().duration(1000).call(Y_AXIS);
  if(min_y<=0 && max_y>=0){
    G_AXIS.selectAll(".zeroline").transition().duration(1000)
      .attr("display","inline").attr("stroke", "black").attr("stroke-width",1).attr("fill","none").attr("shape-rendering","crispEdges")
      .attr("d","M0,"+Y_SCALE(0)+"h"+WIDTH);
  }else{
    G_AXIS.selectAll(".zeroline").transition().duration(1000).attr("display","none");
  }
  G_AXIS.selectAll(".y.axis .ylabel").text("Expression");
  
  //plot legend
  var legend_row =  G_LEGEND.selectAll("g").data(data[1], function(d){return d[1];});
  legend_row.enter().append("g").style("opacity", 1e-6)
    .each(function(d,i){
      d3.select(this).append("rect").attr("x", WIDTH+2).attr("width", 12).attr("height", 12).style("fill", function(d,i) { return fs_color(d[0],d[1]); });
      d3.select(this).append("text").attr("class","text").attr("x", WIDTH+16).attr("y", 5).attr("dy", ".35em").style("text-anchor", "start")
        .text(function(d) { return d[0]+' - '+d[1]+(parseFloat(data[4][i])<0.01 ? " (<0.01)" : " ("+parseFloat(data[4][i]).toFixed(2)+")"); });
    });
  legend_row.transition().duration(1000).style("opacity", 1).attr("transform", function(d, i) { return "translate(0," + i * 14 + ")"; });
  legend_row.exit().transition().duration(500).style("opacity", 0).remove();
  
  //lineplot - median points
  var medpt = G_MEDIANPT.selectAll("circle").data(datastruct, function(d) {return d[8];});
  medpt.enter().append("circle")
    .attr("cx", function(d) { return X_SCALE(data[0][d[0]])+X_SCALE.rangeBand()/2;})
    .attr("cy", function(d) { return Y_SCALE(d[4]); })
    .attr("fill", function(d) { return fs_color(data[1][d[1]][0],data[1][d[1]][1]); })
    .attr("r",5).attr("stroke", "black").attr("stroke-width","1px").style("opacity", 1e-6);
  medpt.on('mouseover', function(d){
    d3.select(this).transition().duration(100)
    .attr("stroke-width","5px").attr("fill","white")
    .attr("stroke",function(d) { return fs_color(data[1][d[1]][0],data[1][d[1]][1]); })
  }).on('mouseout', function(d){
    d3.select(this).transition().duration(100)
    .attr("stroke-width","1px").attr("stroke", "black")
    .attr("fill",function(d) { return fs_color(data[1][d[1]][0],data[1][d[1]][1]); })
  });
  medpt.transition().duration(1000).style("opacity", 1).attr("cy", function(d) { return Y_SCALE(d[4]); });
  medpt.exit().transition().duration(500).attr("r",0).style("opacity", 0).remove();
  
  //lineplot - line
  var lines = G_LINE.selectAll("path").data(data[1], function(d){return d[1];});
  lines.enter().append("path")
    .attr("d", function(d,i){
      var pathstr = "M";
      for(j=0; j<sgcount; j++){
        pathstr+= X_SCALE(data[0][j])+X_SCALE.rangeBand()/2+','+Y_SCALE(data[3][i][j][2])+"L"
      }
      return pathstr.slice(0,-1);
    })
    .attr("stroke", function(d,i){ return fs_color(d[0],d[1]); })
    .attr("stroke-width",2).attr("fill","none").style("opacity", 1e-6);
  lines.transition().duration(1000).style("opacity", 1)
    .attr("d", function(d,i){
      var pathstr = "M";
      for(j=0; j<sgcount; j++){
        pathstr+= X_SCALE(data[0][j])+X_SCALE.rangeBand()/2+','+Y_SCALE(data[3][i][j][2])+"L"
      }
      return pathstr.slice(0,-1);
    });
  lines.exit().transition().duration(500).attr("stroke-width",0).style("opacity", 0).remove();
  
  //bar plot
  var bars = G_BAR.selectAll("rect").data(datastruct, function(d) {return d[8];});
  bars.enter().append("rect")
    .attr("x", function(d) {return X_SCALE(data[0][d[0]])+X_SCALE.rangeBand()*(d[1]/fscount);} )
    .attr("y", function(d) {return Y_SCALE(Math.max(0, d[4]));} )
    .attr("width", X_SCALE.rangeBand()/fscount)
    .attr("height", function(d) {
      if(d[4]>=0){
        return Math.abs(Math.min(HEIGHT-Y_SCALE(d[4]),Y_SCALE(d[4])-Y_SCALE(0)))
      }else{
        return Math.abs(Math.max(HEIGHT-Y_SCALE(d[4]),Y_SCALE(0)-Y_SCALE(d[4])))
      }
    })
    .attr("fill", function(d) { return fs_color(data[1][d[1]][0],data[1][d[1]][1]); } )
    .attr("stroke-width","1px").attr("stroke", "black").style("opacity", 1e-6);
  bars.transition().duration(1000).style("opacity", 1)
    .attr("x", function(d) {return X_SCALE(data[0][d[0]])+X_SCALE.rangeBand()*(d[1]/fscount);} )
    .attr("y", function(d) {return Y_SCALE(Math.max(0, d[4]));} )
    .attr("width", X_SCALE.rangeBand()/fscount)
    .attr("height", function(d) {
      if(d[4]>=0){
        return Math.abs(Math.min(HEIGHT-Y_SCALE(d[4]),Y_SCALE(0)-Y_SCALE(d[4])))
      }else{
        return Math.abs(Math.max(Y_SCALE(d[4])-HEIGHT,Y_SCALE(d[4])-Y_SCALE(0)))
      }
    });
  bars.exit().transition().duration(500).attr("height",0).attr("y",HEIGHT).style("opacity", 0).remove();
  
  //box plot
  var boxs = G_BOX.selectAll("path").data(datastruct, function(d) {return d[8];});
  boxs.enter().append("path")
    .attr("d", function(d,i){
      var barwidth = X_SCALE.rangeBand()/fscount; var bargap = barwidth/10;
      var x_l = X_SCALE(data[0][d[0]]) + X_SCALE.rangeBand()*(d[1]/fscount) + bargap;
      var x_r = X_SCALE(data[0][d[0]]) + X_SCALE.rangeBand()*(d[1]/fscount) - bargap + barwidth;
      var x_m = X_SCALE(data[0][d[0]]) + X_SCALE.rangeBand()*(d[1]/fscount) + barwidth/2;
      
      //construct path string to draw one box
      var pathstr = "M"+x_l+","+Y_SCALE(d[6])+"H"+x_r + "M"+x_l+","+Y_SCALE(d[4])+"H"+x_r + "M"+x_l+","+Y_SCALE(d[2])+"H"+x_r; //top mid bottom whiskers
      pathstr += "M"+x_l+","+Y_SCALE(d[5])+"H"+x_r+"V"+Y_SCALE(d[3])+"H"+x_l+"V"+Y_SCALE(d[5]); //IQR box
      pathstr += "M"+x_m+","+Y_SCALE(d[6])+"V"+Y_SCALE(d[5])+"M"+x_m+","+Y_SCALE(d[3])+"V"+Y_SCALE(d[2]); //vertical line
      return pathstr;
    })
    .attr("stroke", function(d,i){ return fs_color(data[1][d[1]][0],data[1][d[1]][1]); })
    .attr("stroke-width",1).attr("fill","none").style("opacity", 1e-6);
  boxs.transition().duration(1000).style("opacity", 1)
    .attr("d", function(d,i){
      var barwidth = X_SCALE.rangeBand()/fscount; var bargap = barwidth/10;
      var x_l = X_SCALE(data[0][d[0]]) + X_SCALE.rangeBand()*(d[1]/fscount) + bargap;
      var x_r = X_SCALE(data[0][d[0]]) + X_SCALE.rangeBand()*(d[1]/fscount) - bargap + barwidth;
      var x_m = X_SCALE(data[0][d[0]]) + X_SCALE.rangeBand()*(d[1]/fscount) + barwidth/2;
      
      //construct path string to draw one box
      var pathstr = "M"+x_l+","+Y_SCALE(d[6])+"H"+x_r + "M"+x_l+","+Y_SCALE(d[4])+"H"+x_r + "M"+x_l+","+Y_SCALE(d[2])+"H"+x_r; //top mid bottom whiskers
      pathstr += "M"+x_l+","+Y_SCALE(d[5])+"H"+x_r+"V"+Y_SCALE(d[3])+"H"+x_l+"V"+Y_SCALE(d[5]); //IQR box
      pathstr += "M"+x_m+","+Y_SCALE(d[6])+"V"+Y_SCALE(d[5])+"M"+x_m+","+Y_SCALE(d[3])+"V"+Y_SCALE(d[2]); //vertical line
      return pathstr;
    });
  boxs.exit().transition().duration(500).attr("stroke-width",0).style("opacity", 0).remove();
  
  //raw data points
  var datapt = G_DATAPT.selectAll("rect").data(datapoints, function(d) { return d[3]; });
  datapt.enter().append("rect")
    .attr("width",8).attr("height",8)
    .attr("x", function(d) { return X_SCALE(data[0][d[0]]); })
    .attr("y", function(d) { return Y_SCALE(d[2]); })
    .attr("transform", function(d){ return "rotate(-45,"+ (X_SCALE(data[0][d[0]])+4) + ","+ (Y_SCALE(d[2])+4) +")";})
    .attr("stroke", function(d) { return fs_color(data[1][d[1]][0],data[1][d[1]][1]); })
    .attr("fill","none").attr("stroke-width",1).style("opacity", 1e-6);
  datapt.transition().duration(1000).style("opacity", 1)
    .attr("y", function(d) { return Y_SCALE(d[2]); })
    .attr("transform", function(d){
      var x_offset=0;
      if(PLOT_TYPE=="div_boxplot"){
        var barwidth = X_SCALE.rangeBand()/fscount;
        x_offset = X_SCALE.rangeBand()*(d[1]/fscount) + _.random(barwidth/3, barwidth*2/3);
      }else{
        x_offset = _.random(X_SCALE.rangeBand()/3, X_SCALE.rangeBand()*2/3);
      }
      return "translate("+(x_offset-4)+",-4) rotate(45,"+(X_SCALE(data[0][d[0]])+4)+","+ (Y_SCALE(d[2])+4) +")";
    });
  datapt.exit().transition().duration(500).attr("width",0).attr("height",0).style("opacity", 0).remove();
  
  //error bars
  var errbar = G_ERRORBAR.selectAll("path").data(datastruct, function(d) {return d[8];});
  errbar.enter().append("path")
    .attr("d", function(d,i){
      var x_m = X_SCALE(data[0][d[0]]);
      if(PLOT_TYPE=="div_barplot"){
        x_m += X_SCALE.rangeBand()*(d[1]/fscount) + X_SCALE.rangeBand()/fscount/2;
      }else{
        x_m += X_SCALE.rangeBand()/2;
      }
      var pathstr = "M"+x_m+","+Y_SCALE(d[4]-2*d[7])+"V"+Y_SCALE(d[4]+2*d[7]);
      pathstr+= "M"+(x_m-2)+","+Y_SCALE(d[4]-2*d[7])+"h4M"+(x_m-2)+","+Y_SCALE(d[4]+2*d[7])+"h4";
      return pathstr;
    })
    .attr("stroke", "black").attr("stroke-width",1).attr("fill","none").style("opacity", 1e-6);
  errbar.transition().duration(1000).style("opacity", 1)
    .attr("d", function(d,i){
      var x_m = X_SCALE(data[0][d[0]]);
      if(PLOT_TYPE=="div_barplot"){
        x_m += X_SCALE.rangeBand()*(d[1]/fscount) + X_SCALE.rangeBand()/fscount/2;
      }else{
        x_m += X_SCALE.rangeBand()/2;
      }
      var pathstr = "M"+x_m+","+Y_SCALE(d[4]-2*d[7])+"V"+Y_SCALE(d[4]+2*d[7]);
      pathstr+= "M"+(x_m-2)+","+Y_SCALE(d[4]-2*d[7])+"h4M"+(x_m-2)+","+Y_SCALE(d[4]+2*d[7])+"h4";
      return pathstr;
    });
  errbar.exit().transition().duration(500).attr("stroke-width",0).style("opacity", 0).remove();
  
  //experiment-wide percentile lines
  var perclines = G_PERCLINE.selectAll("g").data(data[5][0], function(d,i) {return i;});
  perclines.enter().append("g")
    .each(function(d,i){
      d3.select(this).append("line").attr("x1",0).attr("x2",WIDTH).attr("y1",0).attr("y2",0)
        .attr("stroke", "black").attr("stroke-width",1).attr("stroke-dasharray","20,5,5,5");
      d3.select(this).append("rect").attr("x",0).attr("y",-7).attr("width",26).attr("height",13)
        .attr("fill","white").attr("stroke", "black").attr("stroke-width",1);
      d3.select(this).append("text").attr("class","text").attr("x", 2).attr("y", 0).attr("dy", ".35em").style("text-anchor", "start")
        .text(function(d) { return (i+1)*25+'%'; });
    });
  perclines.transition().duration(1000).attr("transform", function(d) { return "translate(0," + Y_SCALE(d) + ")"; });
  perclines.exit().transition().duration(500).attr("stroke-width",0).style("opacity", 0).remove();
  
  //heatmap related elements
  
  var color_scale;
  if(MEANCENT){
    //define color scale using this experiment's min(red)->zero(white)->max(green) expression values
    color_scale = d3.scale.linear().domain([Math.min(min_y,0), 0, Math.max(max_y,0)]).range(["red", "white", "green"]);
  }else{
    //define color scale using the whole experiment's min(red)->median(white)->max(green) expression values
    color_scale = d3.scale.linear().domain([data[5][1][0], data[5][0][1], data[5][1][1]]).range(["red", "white", "green"]);
  }
  //calculate optimal grid size
  var gridsize = Math.min(HEATWIDTH/fscount,HEATHEIGHT/sgcount);
  
  var heatgrid = G_HEATGRID.selectAll("rect").data(datastruct, function(d) {return d[8];}); //d[4]=med
  heatgrid.enter().append("rect").style("opacity", 1e-6)
    .attr("x", function(d) {return CLUSTERX ? d[9]*gridsize : d[1]*gridsize;} )
    .attr("y", function(d) {return d[0]*gridsize;} )
    .attr("width", gridsize).attr("height", gridsize)
    .attr("fill", function(d) { return color_scale(d[4]); })
    .attr("stroke-width","1px").attr("stroke", function(d) { return color_scale(d[4]); });
  heatgrid.transition().duration(1000).style("opacity", 1)
    .attr("x", function(d) {return CLUSTERX ? d[9]*gridsize : d[1]*gridsize;} )
    .attr("y", function(d) {return d[0]*gridsize;} )
    .attr("width", gridsize).attr("height", gridsize)
    .attr("fill", function(d) { return color_scale(d[4]); })
    .attr("stroke-width","1px").attr("stroke", function(d) { return color_scale(d[4]); });
  heatgrid.exit().transition().duration(500).attr("width",0).style("opacity", 0).remove();
  
  var heatxlbl = G_HEATXLBL.selectAll("text").data(data[1], function(d){return d[1];});
  heatxlbl.enter().append("text").style("opacity", 1e-6)
    .attr("class","text").attr("y",0).attr("dy", ".35em").style("text-anchor", "start")
    .attr("x",function(d,i) {return CLUSTERX ? treeorder.indexOf(i)*gridsize+gridsize/2+2 : i*gridsize+gridsize/2+2;})
    .text(function(d,i) { return d[0]+' - '+d[1]+(parseFloat(data[4][i])<0.01 ? " (<0.01)" : " ("+parseFloat(data[4][i]).toFixed(2)+")"); })
    .attr("transform", function(d,i){return "rotate(-90,"+(CLUSTERX ? treeorder.indexOf(i)*gridsize+gridsize/2 : i*gridsize+gridsize/2)+",0)";});
  heatxlbl.transition().duration(1000).style("opacity", 1)
    .attr("x",function(d,i) {return CLUSTERX ? treeorder.indexOf(i)*gridsize+gridsize/2+2 : i*gridsize+gridsize/2+2;})
    .text(function(d,i) { return d[0]+' - '+d[1]+(parseFloat(data[4][i])<0.01 ? " (<0.01)" : " ("+parseFloat(data[4][i]).toFixed(2)+")"); })
    .attr("transform", function(d,i){return "rotate(-90,"+(CLUSTERX ? treeorder.indexOf(i)*gridsize+gridsize/2 : i*gridsize+gridsize/2)+",0)";});
  heatxlbl.exit().transition().duration(500).style("opacity", 0).remove();
    
  var heatylbl = G_HEATYLBL.selectAll("text").data(data[0], function(d){return d;});
  heatylbl.enter().append("text").style("opacity", 1e-6)
    .attr("class","text").attr("x", -2).attr("y", function(d,i) {return i*gridsize+gridsize/2;} ).attr("dy", ".35em").style("text-anchor", "end")
    .text(function(d){return d});
  heatylbl.transition().duration(1000).style("opacity", 1)
    .attr("y", function(d,i) {return i*gridsize+gridsize/2;} ).text(function(d){return d});
  heatylbl.exit().transition().duration(500).style("opacity", 0).remove();
  
  var legenddata = [];
  if(MEANCENT){
    for(i=0; i<=20; i++){ legenddata[legenddata.length] = i*(max_y-min_y)/20+min_y;}
  }else{
    for(i=0; i<10; i++){ legenddata[legenddata.length] = i*(data[5][0][1]-data[5][1][0])/10+data[5][1][0];}
    for(i=10; i<=20; i++){ legenddata[legenddata.length] = (i-10)*(data[5][1][1]-data[5][0][1])/10+data[5][0][1];}
  }
  var x_step = (DIV_WIDTH-40)/21;
  var heatlegend = G_HEATLEGEND.selectAll("g").data(legenddata);
  heatlegend.enter().append("g")
    .each(function(d,i){
      d3.select(this).append("rect").attr("x",i*x_step-HEATMARGIN.left+20).attr("y",HEATHEIGHT+20).attr("width",x_step).attr("height",20)
        .attr("fill",function(d){return color_scale(d)});
      d3.select(this).append("text").attr("class","text").attr("x",i*x_step+x_step/2-HEATMARGIN.left+20)
        .attr("y", HEATHEIGHT+20*2/3).attr("dy", ".35em").style("text-anchor", "middle")
        .text(function(d) { return parseFloat(d).toFixed(2); });
    });
  heatlegend.each(function(d){
      d3.select(this).select("rect").attr("fill",function(d){return color_scale(d)});
      d3.select(this).select("text").text(function(d) { return parseFloat(d).toFixed(2); });
    });
  heatlegend.exit().transition().duration(500).style("opacity", 0).remove();
  
  var multiplier = (data[1].length == 1) ? 0 : (HEATMARGIN.top-20)/treelinear[treelinear.length-1][2];
  var dendrogram = G_HEATDENDRO.selectAll("path").data(treelinear);
  dendrogram.enter().append("path")
    .attr("d", function(d){
      var pathstr = "M"+(d[3]*gridsize+gridsize/2)+",-"+(d[0]*multiplier)+"v-"+((d[2]-d[0])*multiplier);
      pathstr+= "h"+((d[4]-d[3])*gridsize) + "v" + ((d[2]-d[1])*multiplier);
      return pathstr;
    })
    .attr("stroke", "black").attr("stroke-width",1).attr("fill","none").attr("shape-rendering","crispEdges").style("opacity", 1e-6);
  dendrogram.transition().duration(1000).style("opacity", 1)
    .attr("d", function(d){
      var pathstr = "M"+(d[3]*gridsize+gridsize/2)+",-"+(d[0]*multiplier)+"v-"+((d[2]-d[0])*multiplier);
      pathstr+= "h"+((d[4]-d[3])*gridsize) + "v" + ((d[2]-d[1])*multiplier);
      return pathstr;
    });
  dendrogram.exit().transition().duration(500).attr("stroke-width",0).style("opacity", 0).remove();
}
