//Global Variable to track the state of elements
var FS_DATA; //data returned from ajax requests
var FS_DATA_MC,FS_DATA_FLT,FS_DATA_FLT_MC; //alternative data for filtered and mean centered
var HCLUST_TREE,HCLUST_TREE_FLT,HCLUST_TREE_MC,HCLUST_TREE_FLT_MC; //hierarchical tree for datasets used in heatmap
var FS_PREV; //features already plotted previously
var FS_CURR; //features to be plotted
var FS_TOADD; //features to add to existing plot
var FS_TORMV; //features to remove from existing plot
var PLOT_TYPE; //div_lineplot,div_barplot,div_boxplot,div_heatmap
var SHOWDATAPT,SHOWERRBAR,SHOWPERC; //plot overlays, boolean
var SHOWDENDRO,CLUSTERX; //heapmap options
var MEANCENT,FS_FILTER; //mean center and filter feature switch
var MAX_FEATURES_TOPLOT = 20; //the maximum amount of features to plot

function tree_traverse(o,treeorder,medpoints) {
  var treeleft = o.left.size==1 ? _.indexOf(medpoints, o.left.canonical):tree_traverse(o.left,treeorder,medpoints);
  var treeright = o.right.size==1 ? _.indexOf(medpoints, o.right.canonical):tree_traverse(o.right,treeorder,medpoints);
  treeorder = [treeleft, treeright, o.dist];
  return treeorder;
}

function buildAlternativeData(fs_data){
  //compute filtered dataset
  FS_DATA_FLT = [fs_data[0],[],[],[],[],fs_data[5]];
  for(i=0; i<fs_data[4].length; i++){
    if(fs_data[4][i][1]){
      FS_DATA_FLT[1][FS_DATA_FLT[1].length] = fs_data[1][i];
      FS_DATA_FLT[2][FS_DATA_FLT[2].length] = fs_data[2][i];
      FS_DATA_FLT[3][FS_DATA_FLT[3].length] = fs_data[3][i];
      FS_DATA_FLT[4][FS_DATA_FLT[4].length] = fs_data[4][i];
    }
  }
  
  //compute arrays of medpoints in each featureset
  var medpoints = _.map(fs_data[3], function(d){
    var medpoint = [];
    for(i=0; i<d.length; i++){ medpoint[medpoint.length] = d[i][2];}
    return medpoint;
  });
  var medpoints_flt = _.map(FS_DATA_FLT[3], function(d){
    var medpoint = [];
    for(i=0; i<d.length; i++){ medpoint[medpoint.length] = d[i][2];}
    return medpoint;
  });
  
  //compute mean-center dataset
  FS_DATA_MC = $.extend(true, [], fs_data);
  for(i=0; i<fs_data[4].length; i++){
    var mean = _.reduce(medpoints[i], function(a,b){ return a+b; }, 0)/medpoints[i].length;
    for(j=0; j<fs_data[2][i].length; j++){
      FS_DATA_MC[2][i][j] = _.map(FS_DATA_MC[2][i][j], function(d){ return d-mean; });
      FS_DATA_MC[3][i][j][0] -= mean;
      FS_DATA_MC[3][i][j][1] -= mean;
      FS_DATA_MC[3][i][j][2] -= mean;
      FS_DATA_MC[3][i][j][3] -= mean;
      FS_DATA_MC[3][i][j][4] -= mean;
    }
  }
  FS_DATA_FLT_MC = $.extend(true, [], FS_DATA_FLT);
  for(i=0; i<FS_DATA_FLT[4].length; i++){
    var mean = _.reduce(medpoints_flt[i], function(a,b){ return a+b; }, 0)/medpoints_flt[i].length;
    for(j=0; j<FS_DATA_FLT[2][i].length; j++){
      FS_DATA_FLT_MC[2][i][j] = _.map(FS_DATA_FLT_MC[2][i][j], function(d){ return d-mean; });
      FS_DATA_FLT_MC[3][i][j][0] -= mean;
      FS_DATA_FLT_MC[3][i][j][1] -= mean;
      FS_DATA_FLT_MC[3][i][j][2] -= mean;
      FS_DATA_FLT_MC[3][i][j][3] -= mean;
      FS_DATA_FLT_MC[3][i][j][4] -= mean;
    }
  }
  
  //compute arrays of medpoints in each mean center featureset
  var medpoints_mc = _.map(FS_DATA_MC[3], function(d){
    var medpoint = [];
    for(i=0; i<d.length; i++){ medpoint[medpoint.length] = d[i][2];}
    return medpoint;
  });
  var medpoints_flt_mc = _.map(FS_DATA_FLT_MC[3], function(d){
    var medpoint = [];
    for(i=0; i<d.length; i++){ medpoint[medpoint.length] = d[i][2];}
    return medpoint;
  });
  
  //compute clustering for the four datasets
  var clusters = clusterfck.hcluster(medpoints, clusterfck.EUCLIDEAN_DISTANCE, clusterfck.AVERAGE_LINKAGE);
  var clusters_flt = clusterfck.hcluster(medpoints_flt, clusterfck.EUCLIDEAN_DISTANCE, clusterfck.AVERAGE_LINKAGE);
  var clusters_mc = clusterfck.hcluster(medpoints_mc, clusterfck.EUCLIDEAN_DISTANCE, clusterfck.AVERAGE_LINKAGE);
  var clusters_flt_mc = clusterfck.hcluster(medpoints_flt_mc, clusterfck.EUCLIDEAN_DISTANCE, clusterfck.AVERAGE_LINKAGE);
  
  HCLUST_TREE = clusters[0].size==1 ? [0] : tree_traverse(clusters[0],[],medpoints);
  HCLUST_TREE_FLT = clusters_flt[0].size==1 ? [0] : tree_traverse(clusters_flt[0],[],medpoints_flt);
  HCLUST_TREE_MC = clusters_mc[0].size==1 ? [0] : tree_traverse(clusters_mc[0],[],medpoints_mc);
  HCLUST_TREE_FLT_MC = clusters_flt_mc[0].size==1 ? [0] : tree_traverse(clusters_flt_mc[0],[],medpoints_flt_mc);
}

$(document).ready(function(){  
  //experiment selection menu bind
  $("#sel_experiment").change(function(){
    if($(this).val() != null){
      $.get('/experiment',[{name: "experiment", value: $(this).attr('value')}],function(response){
        var resp_parse = '';
        _.each(response,function(d,i){
          if(i%2==0){
            resp_parse+= '&#8226; <b><i>'+d+'</i></b><br/>';
          }else{
            resp_parse+= d+'<br/>';
          }
        });
        $('#desc_experiment').html(resp_parse);
      });
      $("#fs_queryarea,#fs_plotparam").show();
      $("#sel_fsresult,#sel_fstoplot").html(null);
      $("#div_fsresult").text("Query Results: ");
      
      if(FS_CURR.length>0){
        $.post('/fs_batch',{featureset:FS_CURR,experiment:$("#sel_experiment").val()},function(response,status){
          var fs_query = response.sort();
          var resp_parse = '';
          _.each(fs_query, function(d){resp_parse+='<option value="' + d + '">'+ d + '</option>';});
          $("#sel_fstoplot").html(resp_parse);
          $("#div_fstoplot").text("Features To Plot: "+response.length);
          FS_CURR = fs_query;
          FS_PREV = [];
          //FS_TOADD = fs_query;
          //FS_TORMV = FS_PREV;
          
          //re-initialize global variables
          FS_DATA = []; FS_DATA_FLT = []; FS_DATA_MC = []; FS_DATA_FLT_MC = [];
          HCLUST_TREE = []; HCLUST_TREE_FLT = []; HCLUST_TREE_MC = []; HCLUST_TREE_FLT_MC = [];
          //empty svg area
          $("#svg_area").html('');
          //initialize SVG elements
          svg_init();
          $("#button_plot").click();
        });
      }
    }
  });
  
  //search button bind
  $("#button_query").click(function(){
    var query_str = $('#input_query').val();
    var query_type = $('#sel_querytype').val();
    if(query_str != ''){
      var params = {"experiment":$("#sel_experiment").val(),term:query_str,type:$('#sel_querytype').val()};
      $.post('/featureset',params,function(response){
        var fs_query = response.sort();
        var resp_parse = '';
        _.each(fs_query, function(d){resp_parse+='<option value="' + d + '">'+ d + '</option>';});
        $("#sel_fsresult").html(resp_parse);
        $("#div_fsresult").text("Query Results: "+response.length);
        if(response.length == 1){
	      $("#sel_fsresult option:first").attr('selected','selected');
        }
      });
    }
  });
  
  //input box autocomplete
  $("#input_query").autocomplete({
    source: function(request,response){
      //console.log(request);
      //console.log(response);
      var params = {"experiment":$("#sel_experiment").val(),"term":request.term};
      $.post('/go_term',params,function(data){
        response(data);
      });
    },
    minLength: 2,
    disabled: true
  });
  
  //query type change: enable autocomplete for GO
  $('#sel_querytype').change(function(){
    if($(this).val() == 'opt_go'){
      $("#input_query").autocomplete("enable");
    }else{
      $("#input_query").autocomplete("disable");
    };
  });
  //bind "enter" keypress
  $('#input_query').keyup(function (e){
    if(e.keyCode == 13){
      $("#button_query").click();
    }
  });
  
  //add and add_all button bind
  $("#button_add,#button_addall").click(function(){
    if($(this).attr('id')=='button_addall'){
      $('#sel_fsresult option').prop('selected', true);
    }
    FS_CURR = _.compact(_.union($("#sel_fsresult").val(),FS_CURR)).sort();
    var toplot = '';
    _.each(FS_CURR, function(d){toplot+='<option value="' + d + '">'+ d + '</option>';});
    $("#sel_fstoplot").html(toplot);
    $("#div_fstoplot").text("Features To Plot: "+FS_CURR.length);
    $("#button_plot").click();
  });
  
  //remove and remove_all button bind
  $("#button_rmv,#button_rmvall").click(function(){
    switch($(this).attr('id')){
    case 'button_rmv':
      FS_CURR = _.compact(_.difference(FS_CURR,$("#sel_fstoplot").val())).sort();
      break;
    case 'button_rmvall':
      FS_CURR = [];
      break;
    }
    var options = '';
    _.each(FS_CURR, function(d){options+='<option value="' + d + '">'+ d + '</option>';});
    $("#sel_fstoplot").html(options);
    $("#div_fstoplot").text("Features To Plot: "+FS_CURR.length);
    $("#button_plot").click();
  });
  
  //plot type and plot options bind
  $("#div_lineplot,#div_barplot,#div_boxplot,#div_heatmap").click(function(){
    if(!$(this).hasClass('div_button_sel')){
      PLOT_TYPE = $(this).attr("id");
      
      if($(this).attr("id")=='div_heatmap'){
        $("#div_datapoint,#div_errorbar,#div_percentile").hide();
        $("#div_dendrogram,#div_clusterX").show();
      }else{
        $("#div_datapoint,#div_errorbar,#div_percentile").show();
        $("#div_dendrogram,#div_clusterX").hide();
      }
      
      if(FS_DATA.length!=0){
        if(MEANCENT){
          FS_FILTER ? updatePlot(FS_DATA_FLT_MC,HCLUST_TREE_FLT_MC) : updatePlot(FS_DATA_MC,HCLUST_TREE_MC);
        }else{
          FS_FILTER ? updatePlot(FS_DATA_FLT,HCLUST_TREE_FLT) : updatePlot(FS_DATA,HCLUST_TREE);
        }
      }
      $("#div_lineplot,#div_barplot,#div_boxplot,#div_heatmap").removeClass('div_button_sel'); 
      $(this).addClass('div_button_sel');
      updatePlotType();
    }
  });
  $("#div_datapoint,#div_errorbar,#div_percentile,#div_filterfs,#div_dendrogram,#div_clusterX,#div_meancent").click(function(){
    var newstate = ($(this).hasClass('div_button_sel') ? false : true);
    (newstate ? $(this).addClass('div_button_sel') : $(this).removeClass('div_button_sel'));
    switch($(this).attr("id")){
    case 'div_datapoint':
      SHOWDATAPT = newstate;
      updatePlotType();
      break;
    case 'div_errorbar':
      SHOWERRBAR = newstate;
      updatePlotType();
      break;
    case 'div_percentile':
      SHOWPERC = newstate;
      updatePlotType();
      break;
    case 'div_dendrogram':
      SHOWDENDRO = newstate;
      updatePlotType();
      break;
    case 'div_filterfs':
      FS_FILTER = newstate;
      if(FS_DATA.length!=0){
        if(MEANCENT){
          FS_FILTER ? updatePlot(FS_DATA_FLT_MC,HCLUST_TREE_FLT_MC) : updatePlot(FS_DATA_MC,HCLUST_TREE_MC);
        }else{
          FS_FILTER ? updatePlot(FS_DATA_FLT,HCLUST_TREE_FLT) : updatePlot(FS_DATA,HCLUST_TREE);
        }
        updatePlotType();
      }
      break;
    case 'div_clusterX':
      CLUSTERX = newstate;
      if(FS_DATA.length!=0){
        if(MEANCENT){
          FS_FILTER ? updatePlot(FS_DATA_FLT_MC,HCLUST_TREE_FLT_MC) : updatePlot(FS_DATA_MC,HCLUST_TREE_MC);
        }else{
          FS_FILTER ? updatePlot(FS_DATA_FLT,HCLUST_TREE_FLT) : updatePlot(FS_DATA,HCLUST_TREE);
        }
        updatePlotType();
      }
      break;
    case 'div_meancent':
      MEANCENT = newstate;
      if(FS_DATA.length!=0){
        if(MEANCENT){
          FS_FILTER ? updatePlot(FS_DATA_FLT_MC,HCLUST_TREE_FLT_MC) : updatePlot(FS_DATA_MC,HCLUST_TREE_MC);
        }else{
          FS_FILTER ? updatePlot(FS_DATA_FLT,HCLUST_TREE_FLT) : updatePlot(FS_DATA,HCLUST_TREE);
        }
        updatePlotType();
      }
      break;
    }
  });
  
  //clear plot button bind
  $("#button_clrplot").click(function(){
    //empty "features to plot" box
    $("#sel_fstoplot").html('');
    $("#div_fstoplot").text("Features To Plot: ");
    
    //re-initialize global variables
    FS_DATA = []; FS_DATA_FLT = []; FS_DATA_MC = []; FS_DATA_FLT_MC = []; 
    FS_PREV = []; FS_CURR = []; FS_TOADD = []; FS_TORMV = [];
    HCLUST_TREE = []; HCLUST_TREE_FLT = []; HCLUST_TREE_MC = []; HCLUST_TREE_FLT_MC = [];
    
    //empty svg area
    $("#svg_area").html('');
    //initialize SVG elements
    svg_init();
  });
  
  //plot button bind
  $("#button_plot").click(function(){
    FS_TOADD = _.difference(FS_CURR,FS_PREV);
    FS_TORMV = _.difference(FS_PREV,FS_CURR);
    console.log("added: "+FS_TOADD+"   removed:"+FS_TORMV);
    
    if((FS_TOADD.length==0 && FS_TORMV.length==0) || FS_CURR.length==0){
      //alert("Add Features to 'Features To Plot' Box For Plotting.");
      if(FS_PREV.length!=0 && FS_CURR.length==0){
        $("#button_clrplot").click();
      }
      return;
    }else if(FS_CURR.length>MAX_FEATURES_TOPLOT){
      alert("Too many features selected, please select less than "+MAX_FEATURES_TOPLOT+".");
      return;
    }else if(FS_TOADD.length==0){
      //build post-delete dataset without ajax
      var fs_data_del = [FS_DATA[0],[],[],[],[],FS_DATA[5]];
      for(i=0; i<FS_DATA[1].length; i++){
        if(FS_TORMV.indexOf(FS_DATA[1][i][0])==-1){
          fs_data_del[1][fs_data_del[1].length] = FS_DATA[1][i];
          fs_data_del[2][fs_data_del[2].length] = FS_DATA[2][i];
          fs_data_del[3][fs_data_del[3].length] = FS_DATA[3][i];
          fs_data_del[4][fs_data_del[4].length] = FS_DATA[4][i];
        }
      }
      FS_DATA = fs_data_del;
      
      buildAlternativeData(FS_DATA);
      if(MEANCENT){
        FS_FILTER ? updatePlot(FS_DATA_FLT_MC,HCLUST_TREE_FLT_MC) : updatePlot(FS_DATA_MC,HCLUST_TREE_MC);
      }else{
        FS_FILTER ? updatePlot(FS_DATA_FLT,HCLUST_TREE_FLT) : updatePlot(FS_DATA,HCLUST_TREE);
      }
      
      FS_PREV = FS_CURR;
      FS_TOADD = [];FS_TORMV = [];
    }else {
      //ajax request for new data
      var serializestr = "experiment="+$("#sel_experiment").val();
      _.each(FS_CURR, function(d,i){serializestr+='&fs.'+i+'='+d;});
      loadingicon('ajaxstart');
      
      $.post("/getdata",{featureset:FS_CURR,experiment:$("#sel_experiment").val()},function(data,status){
        loadingicon('ajaxstop');
        FS_DATA = data;
        
        buildAlternativeData(FS_DATA);
        if(MEANCENT){
          FS_FILTER ? updatePlot(FS_DATA_FLT_MC,HCLUST_TREE_FLT_MC) : updatePlot(FS_DATA_MC,HCLUST_TREE_MC);
        }else{
          FS_FILTER ? updatePlot(FS_DATA_FLT,HCLUST_TREE_FLT) : updatePlot(FS_DATA,HCLUST_TREE);
        }
        
        FS_PREV = FS_CURR;
        FS_TOADD = [];FS_TORMV = [];
      });
    }
  });
  
  //initialize global variables
  FS_DATA = []; FS_DATA_FLT = []; FS_DATA_MC = []; FS_DATA_FLT_MC = []; 
  FS_PREV = []; FS_CURR = []; FS_TOADD = []; FS_TORMV = [];
  HCLUST_TREE = []; HCLUST_TREE_FLT = []; HCLUST_TREE_MC = []; HCLUST_TREE_FLT_MC = [];
  SHOWDATAPT = false; SHOWERRBAR = false; SHOWPERC = false; FS_FILTER = false; 
  SHOWDENDRO = false; CLUSTERX = false; MEANCENT = false;
  
  $("#sel_experiment").val(null);
  $("#sel_querytype").val("opt_str");
  $("#input_query").val("");
  $("#fs_queryarea,#fs_plotparam").hide();
  $("#div_lineplot").addClass('div_button_sel');
  PLOT_TYPE = 'div_lineplot';
  $("#div_dendrogram,#div_clusterX").hide();
  
  //initialize SVG elements
  svg_init();
})
