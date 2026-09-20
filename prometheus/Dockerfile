FROM prom/prometheus:v3.14.0

COPY prometheus.yml /etc/prometheus/prometheus.yml
RUN /bin/promtool check config /etc/prometheus/prometheus.yml

CMD ["--config.file=/etc/prometheus/prometheus.yml", "--storage.tsdb.path=/prometheus", "--storage.tsdb.retention.time=15d", "--storage.tsdb.retention.size=5GB", "--web.listen-address=0.0.0.0:9090", "--web.enable-otlp-receiver"]

