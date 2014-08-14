require 'sinatra'
require 'haml'
require 'json'
require 'statsample'

#This script sets up the DataMapper objects
require "#{File.expand_path(File.dirname(__FILE__))}/scripts/db_schema.rb"

#Connect to postgresql db
db_info = JSON.parse(File.read("./db_info.json"))
puts "connecting to db...\n"
DataMapper.setup(:default, "postgres://#{db_info["username"]}:#{db_info["password"]}@#{db_info["host"]}/#{db_info["db"]}")
puts "db connected\n"

#Log everything
#log = File.new("./log/sinatra.log", "a")
#STDOUT.reopen(log)
#STDERR.reopen(log)

#Runs the base page with a list of all available experiments
get '/' do  
  haml :app, :locals => {:experimentgroups => Experimentgroup.all(:order => [ :name.asc])}
end

#AJAX POST handler for GO Term autocomplete
post '/go_term' do  
  content_type :json
  e_id = params[:experiment].split("_")[1]
  searchstr = Regexp.escape(params[:term])
  go = Go.all(:limit => 10, :term => /(?i)#{searchstr}/, Go.species.experiments.id => e_id)
  go.map{|go| "[#{go.go_id}] #{go.term}"}.to_json
end

#AJAX POST handler for featureset name query
post '/featureset' do
  content_type :json
  expr_id = params[:experiment].split("_")[1]
  featuresets = []
  if params[:type] == "opt_str"
    searchstr = Regexp.escape(params[:term]) #escape regexp characters
    searchstr = searchstr.gsub('\?','.').gsub('\*','.+') #wildcards: ?(1 char) *(1 or more char)
    featuresets = Featureset.all(:name => /(?i)^#{searchstr}/, :experiment => {:id => expr_id})
    featuresets.uniq.map{|fs| fs.name}.to_json
  elsif params[:type] == "opt_regexp"
    featuresets = Featureset.all(:name => /#{params[:term]}/, :experiment => {:id => expr_id})
    featuresets.uniq.map{|fs| fs.name}.to_json
  elsif params[:type] == "opt_go"
    params[:term] =~ /^\[(.+)\] (.+)$/
    genes = Gene.all(Gene.gos.go_id => $1, Gene.species.experiments.id => expr_id)
    go_genes = genes.map{|g| g.name}
    go_genes.each do |g|
      searchstr = Regexp.escape(g)
      fs_query = Featureset.all(:name => /(?i)^#{searchstr}$/, :experiment => {:id => expr_id})
      if(fs_query.size > 0)
        featuresets << fs_query[0].name
      end
    end
    featuresets.to_json
  end
end

#AJAX POST handler for featureset name query in batch (such as when changing experiment)
post '/fs_batch' do
  content_type :json
  expr_id = params[:experiment].split("_")[1]
  featuresets = params[:featureset]
  
  featuresets_new = [];
  featuresets.each do |fs|
    searchstr = Regexp.escape(fs)
    fs_query = Featureset.all(:name => /(?i)^#{searchstr}$/, :experiment => {:id => expr_id})
    if(fs_query.size > 0)
      featuresets_new << fs_query[0].name
    end
  end
  featuresets_new.to_json
end

#AJAX POST handler for getting data from list of featuresets
post '/getdata' do
  content_type :json
  expr_id = params[:experiment].split("_")[1]
  featuresets = params[:featureset]
  
  #Get the samplegroup names for this experiment    
  sg_labels = Group.all(:experiment => {:id => expr_id}).map{|g| g.name}
  
  fs_labels = []
  datapoints = []
  statistics = []
  p_values = []
  featuresets.each do |fs|
    fs_pval = []
    p_values_temp = [];
    Feature.all(:featureset => {:name => fs, :experiment => {:id => expr_id}}).each do |f|
      fs_f_datapoints = []
      fs_f_statistics = []
      fs_f_datavecs = []
      
      Group.all(:experiment => {:id => expr_id}).each do |g|
        data = Datum.all(:experiment => {:id => expr_id}, :feature => f, :sample => {:group => g}).map{|d| d.value.round(3)}
        vec = data.to_scale
        fs_f_datavecs << vec
        fs_f_statistics << [vec.min,vec.percentil(25),vec.percentil(50),vec.percentil(75),vec.max,vec.sd.nan? ? 0 : vec.sd.round(3)]
        #vec.sd.nan? 0: vec.sd.round(3)
        fs_f_datapoints << data
      end
      
      begin
        pvalue = Statsample::Anova::OneWayWithVectors.new(fs_f_datavecs).probability
      rescue
        pvalue = 1
      end
      
      fs_pval << pvalue
      p_values_temp << [pvalue,false]
      datapoints << fs_f_datapoints
      statistics << fs_f_statistics
      fs_labels << [fs,f.name]
    end
    p_values_temp[p_values_temp.index([fs_pval.min,false])][1] = true
    p_values.concat(p_values_temp)
  end
  
  #obtain experiment-wide percentiles by randomly selecting 1024 averaged sets of data points
  #randset = DataMapper.repository.adapter.select('select avg(value) from data where experiment_id='+expr_id+'and random()<0.01 group by feature_id limit 1024').to_scale
  #randset = DataMapper.repository.adapter.select('select avg(value) from data where experiment_id='+expr_id+'group by feature_id order by random() limit 1024').to_scale
  randset = DataMapper.repository.adapter.select('select value from data where experiment_id='+expr_id+' order by random() limit 2000').to_scale
  minval = DataMapper.repository.adapter.select('select value from data where experiment_id='+expr_id+' order by value limit 1')[0]
  maxval = DataMapper.repository.adapter.select('select value from data where experiment_id='+expr_id+' order by value desc limit 1')[0]
  randpercs = [[randset.percentil(25), randset.percentil(50), randset.percentil(75)], [minval, maxval]]
  
  #Return JSON array of results
  [sg_labels, fs_labels, datapoints, statistics, p_values, randpercs].to_json
end

#AJAX handler to get experiment metadata each time a new experiment is selected
get '/experiment' do
  content_type :json
  expr = YAML::load(Experiment.get(params[:experiment].split("_")[1]).metadata)
  expr_set=[]
  expr.each do |k,v|
    if k != 'name'
      #expr_set<<k+': '+v
      expr_set<<k
      expr_set<<v
    end
  end
  expr_set.to_json
  #haml :experiment, :locals => {:metadata => YAML::load(Experiment.get(params[:experiment].split("_")[1]).metadata)}
end
